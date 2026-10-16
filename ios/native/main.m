#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <notify.h>
#import <signal.h>
#import <fcntl.h>
#import <sys/file.h>
#import <unistd.h>
#import <math.h>
#import "QPPrivate.h"
#import "QPState.h"
#import "QPEventBridge.h"
#import "QPHostController.h"
#import "QPManagerController.h"
#import "UIApplication+Private.h"
#import "UIWindow+Private.h"
#import "SBSAccessibilityWindowHostingController.h"
#import "FBSOrientationObserver.h"
#import "FBSOrientationUpdate.h"

static BOOL QPHUD;
static NSTimeInterval QPDuration;
static QPState *QPStorage;
static NSMutableDictionary *QPStatus;
static NSString *QPInstance;
static int QPLock=-1;
static BOOL QPStopping;
static void QPWriteStatus(void) {
    if (!QPHUD||!QPStatus) return;
    QPStatus[@"updatedAt"]=@(NSDate.date.timeIntervalSince1970);
    [QPStorage writeJSON:QPStatus name:@"hud.json" error:NULL];
}
void QPEventBridgeDiagnostic(NSString *message) { fprintf(stderr,"[QQPet] %s\n",message.UTF8String); if (QPStatus) { QPStatus[@"message"]=message; QPWriteStatus(); } }

@interface QPWindow : UIWindow
@end
@implementation QPWindow
+ (BOOL)_isSystemWindow { return QPHUD; }
- (BOOL)_isWindowServerHostingManaged { return !QPHUD; }
- (BOOL)_ignoresHitTest { return NO; }
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    UIView *hit=[super hitTest:point withEvent:event];
    return hit==self || hit==self.rootViewController.view ? nil : hit;
}
@end

@interface QPAppDelegate : UIResponder <UIApplicationDelegate>
@property(nonatomic,strong) UIWindow *window;
@property(nonatomic,strong) QPHostController *host;
@property(nonatomic,strong) QPManagerController *manager;
@property(nonatomic,strong) QQAssetServer *server;
@property(nonatomic,strong) SBSAccessibilityWindowHostingController *hosting;
@property(nonatomic,strong) FBSOrientationObserver *orientation;
@property(nonatomic) unsigned long long orientationSequence;
@property(nonatomic,strong) NSTimer *control;
@property(nonatomic,strong) dispatch_source_t termination;
@property(nonatomic) int lockNotify;
@property(nonatomic) int bootNotify;
@property(nonatomic) BOOL locked;
@property(nonatomic) BOOL managerActive;
@property(nonatomic) BOOL managerOverride;
@property(nonatomic,copy) NSString *pendingUI;
@property(nonatomic,copy) void (^pendingReply)(id,NSString *);
@property(nonatomic) NSTimeInterval pendingDeadline;
@property(nonatomic) BOOL pendingAcknowledged;
@property(nonatomic) BOOL pendingReturnToHUD;
- (void)stop:(NSString *)reason;
- (void)poll;
- (void)updateLock;
- (void)updateVisibility;
- (void)finishPendingUI:(id)value error:(NSString *)error;
@end
static QPAppDelegate *QPDelegate;

@implementation QPAppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options {
    QPDelegate=self; self.lockNotify=-1; self.bootNotify=-1;
    if (!QPHUD) {
        self.manager=[[QPManagerController alloc] initWithState:QPStorage];
        self.window=[[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
        self.window.rootViewController=[[UINavigationController alloc] initWithRootViewController:self.manager];
        [self.window makeKeyAndVisible]; return YES;
    }
    if (getuid()!=0) { QPStatus[@"fatalError"]=@"HUD requires root persona. Start from the manager installed with TrollStore or an active jailbreak."; [self stop:@"root-persona-required"]; return NO; }
    self.window=[[QPWindow alloc] initWithFrame:UIScreen.mainScreen.fixedCoordinateSpace.bounds];
    self.window.opaque=NO; self.window.backgroundColor=UIColor.clearColor; self.window.windowLevel=10000010;
    NSString *webRoot=[NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"web"];
    NSDictionary *origin=[QPStorage readJSON:@"origin.json"];
    uint16_t port=[origin[@"port"] unsignedShortValue];
    self.server=[[QQAssetServer alloc] initWithWebRoot:webRoot assetRoot:webRoot port:port];
    NSError *error=nil;
    if (![self.server start:&error]) { QPStatus[@"fatalError"]=error.localizedDescription; [self stop:@"asset-origin-unavailable"]; return NO; }
    if (!port) [QPStorage writeJSON:@{@"port":@(self.server.port)} name:@"origin.json" error:NULL];
    NSString *url=[NSString stringWithFormat:@"http://127.0.0.1:%u",self.server.port]; QPStatus[@"origin"]=url;
    self.host=[[QPHostController alloc] initWithState:QPStorage server:self.server role:@"pet"];
    self.window.rootViewController=self.host; [self.window makeKeyAndVisible];
    Class hostingClass=objc_getClass("SBSAccessibilityWindowHostingController");
    if (!hostingClass||![self.window respondsToSelector:@selector(_contextId)]) { QPStatus[@"fatalError"]=@"Global window hosting API is unavailable."; [self stop:@"hosting-unavailable"]; return NO; }
    self.hosting=[[hostingClass alloc] init];
    if (![self.hosting respondsToSelector:@selector(registerWindowWithContextID:atLevel:)]) { [self stop:@"hosting-selector-unavailable"]; return NO; }
    [self.hosting registerWindowWithContextID:self.window._contextId atLevel:self.window.windowLevel];
    QPStatus[@"contextID"]=@(self.window._contextId); QPInstallGlobalEventBridge(self.window);
    QPStatus[@"eventBridgeReady"]=@(QPGlobalEventBridgeReady());
    __weak QPAppDelegate *weakSelf=self;
    QPSetOutsideTouchHandler(^{ [weakSelf.host emit:@"outside" value:nil]; });
    self.host.stopRequested=^(NSString *reason){ [weakSelf stop:reason]; };
    self.host.statusChanged=^(NSDictionary *status){ [QPStatus addEntriesFromDictionary:status]; QPWriteStatus(); };
    self.host.cancelManagerOperation=^(NSNumber *request,NSString *page){
        QPAppDelegate *delegate=weakSelf; NSDictionary *record=[QPStorage readJSON:@"ui-request.json"];
        if (delegate.pendingReply && [record[@"page"] isEqual:page] && (!request || [record[@"id"] isEqual:request]))
            [delegate finishPendingUI:nil error:@"The originating page canceled this action."];
    };
    self.host.managerOperation=^(NSDictionary *request,void (^reply)(id,NSString *)){
        QPAppDelegate *delegate=weakSelf;
        if (delegate.pendingReply) { reply(nil,@"Finish the current manager action first."); return; }
        if (delegate.locked) { reply(nil,@"Unlock the device and open QQPet to complete this action."); return; }
        NSString *token=NSUUID.UUID.UUIDString;
        delegate.pendingUI=token; delegate.pendingReply=reply;
        delegate.pendingReturnToHUD=[request[@"op"] isEqual:@"editText"];
        delegate.pendingDeadline=NSDate.date.timeIntervalSince1970+30; delegate.pendingAcknowledged=NO;
        [QPStatus removeObjectForKey:@"uiError"];
        delegate.managerOverride=NO; [delegate updateVisibility];
        NSMutableDictionary *record=[request mutableCopy]; record[@"instance"]=QPInstance; record[@"requestId"]=token;
        record[@"createdAt"]=@(NSDate.date.timeIntervalSince1970);
        NSError *writeError=nil;
        if (![QPStorage writeJSON:record name:@"ui-request.json" error:&writeError]) { [delegate finishPendingUI:nil error:writeError.localizedDescription ?: @"Could not write the manager request."]; return; }
        // The HUD is not the foreground App. Its UIApplication URL handling and
        // the cached managerActive heartbeat cannot establish an App transition.
        // Every new action requests system activation; poll waits for its token's ack.
        if (!QPActivateManager(NSBundle.mainBundle.bundleIdentifier))
            [delegate finishPendingUI:nil error:@"无法打开 QQPet 管理界面，请手动打开 App 后重试。"];
    };
    Class orientationClass=objc_getClass("FBSOrientationObserver");
    if (orientationClass) {
        self.orientation=[[orientationClass alloc] init];
        [self.orientation setHandler:^(FBSOrientationUpdate *update){
            UIInterfaceOrientation orientation=(UIInterfaceOrientation)update.orientation;
            unsigned long long sequence=update.sequenceNumber;
            dispatch_async(dispatch_get_main_queue(),^{
                QPAppDelegate *delegate=weakSelf;
                if (!delegate || (delegate.orientationSequence && sequence<=delegate.orientationSequence)) return;
                delegate.orientationSequence=sequence;
                [delegate.host updateOrientation:orientation];
            });
        }];
        [self.host updateOrientation:(UIInterfaceOrientation)self.orientation.activeInterfaceOrientation];
    }
    notify_register_dispatch("com.apple.springboard.lockstate",&_lockNotify,dispatch_get_main_queue(),^(int token){ [weakSelf updateLock]; });
    notify_register_dispatch("SBSpringBoardDidLaunchNotification",&_bootNotify,dispatch_get_main_queue(),^(int token){
        // Re-register the existing context; no daemon or duplicate renderer is spawned.
        QPAppDelegate *delegate=weakSelf;
        if (!QPStopping && delegate.hosting) [delegate.hosting registerWindowWithContextID:delegate.window._contextId atLevel:delegate.window.windowLevel];
    });
    QPStatus[@"phase"]=@"running"; QPWriteStatus();
    [self.host loadURL:[NSURL URLWithString:[url stringByAppendingString:@"/index.html"]]];
    [self updateLock];
    self.control=[NSTimer scheduledTimerWithTimeInterval:0.2 repeats:YES block:^(NSTimer *timer){ [weakSelf poll]; }];
    if (QPDuration>0) dispatch_after(dispatch_time(DISPATCH_TIME_NOW,(int64_t)(QPDuration*NSEC_PER_SEC)),dispatch_get_main_queue(),^{ [weakSelf.host requestFlushThen:^{ [weakSelf stop:@"duration-ended"]; }]; });
    signal(SIGTERM,SIG_IGN);
    self.termination=dispatch_source_create(DISPATCH_SOURCE_TYPE_SIGNAL,SIGTERM,0,dispatch_get_main_queue());
    dispatch_source_set_event_handler(self.termination,^{ [weakSelf.host requestFlushThen:^{ [weakSelf stop:@"sigterm"]; }]; }); dispatch_resume(self.termination);
    return YES;
}
- (void)poll {
    if (QPStopping) return;
    NSDictionary *manager=[QPStorage readJSON:@"manager.json"];
    BOOL active=[manager[@"active"] boolValue]&&NSDate.date.timeIntervalSince1970-[manager[@"updatedAt"] doubleValue]<5;
    if (active!=self.managerActive) { self.managerActive=active; self.managerOverride=NO; [self updateVisibility]; }
    NSDictionary *reserved=active?manager[@"reserved"]:nil;
    self.host.managerReservedRect=reserved?CGRectMake([reserved[@"x"] doubleValue],[reserved[@"y"] doubleValue],[reserved[@"width"] doubleValue],[reserved[@"height"] doubleValue]):CGRectZero;
    for (NSDictionary *command in [QPStorage takeCommandsForInstance:QPInstance]) {
        NSString *op=command[@"op"]; NSDictionary *args=command[@"args"] ?: @{};
        if ([op isEqual:@"quit"]) [self.host requestFlushThen:^{ [self stop:@"manager-quit"]; }];
        else if ([op isEqual:@"trayClick"]) { self.managerOverride=YES; [self updateVisibility]; [self.host emit:@"trayClick" value:args]; }
        else if ([op isEqual:@"managerHide"]) { self.managerOverride=NO; [self updateVisibility]; }
        else if ([op isEqual:@"safeArea"]) [self.host emit:@"safeArea" value:nil];
        else if ([op isEqual:@"clipboard"]) [self.host emit:@"clipboard" value:args[@"text"]];
        else if ([op isEqual:@"gamePlayed"]) [self.host emit:@"gamePlayed" value:args];
        else if ([op isEqual:@"importSave"] || [op isEqual:@"exportSave"]) {
            NSString *script=[NSString stringWithFormat:@"window.qqpet&&window.qqpet.%@().catch(e=>console.error(e))",op];
            [self.host.webView evaluateJavaScript:script completionHandler:nil];
        }
    }
    if (self.pendingReply) {
        NSTimeInterval now=NSDate.date.timeIntervalSince1970;
        NSDictionary *ack=[QPStorage readJSON:@"ui-ack.json"];
        if ([ack[@"instance"] isEqual:QPInstance] && [ack[@"requestId"] isEqual:self.pendingUI]) {
            if (!self.pendingAcknowledged) self.pendingDeadline=now+15*60;
            self.pendingAcknowledged=YES;
            // A foreground picker/share sheet can stay open as long as the user
            // needs. A suspended or vanished manager cannot hold the HUD forever.
            if (active) self.pendingDeadline=now+15*60;
        }
    }
    NSDictionary *response=[QPStorage readJSON:@"ui-response.json"];
    if (self.pendingReply&&[response[@"instance"] isEqual:QPInstance]&&[response[@"requestId"] isEqual:self.pendingUI]) {
        id value=response[@"value"]; NSString *error=[response[@"error"] isKindOfClass:NSString.class]?response[@"error"]:nil;
        [NSFileManager.defaultManager removeItemAtPath:[QPStorage path:@"ui-response.json"] error:NULL]; [self finishPendingUI:value error:error];
    } else if (self.pendingReply && NSDate.date.timeIntervalSince1970>=self.pendingDeadline)
        [self finishPendingUI:nil error:self.pendingAcknowledged?@"The manager stopped responding while the action was open. Reopen QQPet and retry; canonical save data is retained.":@"The manager did not accept the action within 30 seconds. Open QQPet and retry."];
    static NSTimeInterval wrote=0;
    if (NSDate.date.timeIntervalSince1970-wrote>=1) { wrote=NSDate.date.timeIntervalSince1970; [self.host updateProcessPolicy]; QPWriteStatus(); }
}
- (void)finishPendingUI:(id)value error:(NSString *)error {
    NSString *token=self.pendingUI; void (^reply)(id,NSString *)=self.pendingReply;
    self.pendingReply=nil; self.pendingUI=nil; self.pendingDeadline=0; self.pendingAcknowledged=NO;
    if (self.pendingReturnToHUD) self.managerOverride=YES;
    self.pendingReturnToHUD=NO;
    for (NSString *name in @[@"ui-request.json",@"ui-ack.json"]) {
        NSDictionary *record=[QPStorage readJSON:name];
        if ([record[@"instance"] isEqual:QPInstance] && [record[@"requestId"] isEqual:token])
            [NSFileManager.defaultManager removeItemAtPath:[QPStorage path:name] error:NULL];
    }
    if (error.length) { QPStatus[@"uiError"]=error; QPStatus[@"message"]=error; }
    [self updateVisibility]; if (reply) reply(value,error);
}
- (void)updateLock {
    if (!QPPrivate.springBoardPort||!QPPrivate.getLockStatus) return;
    mach_port_t port=QPPrivate.springBoardPort(); if (!port) return;
    BOOL locked=NO,passcode=NO; QPPrivate.getLockStatus(port,&locked,&passcode); self.locked=locked;
    [self updateVisibility];
    QPStatus[@"locked"]=@(locked); QPWriteStatus();
}
- (void)updateVisibility {
    BOOL hidden=self.locked||(self.managerActive&&!self.managerOverride)||self.pendingReply!=nil;
    [self.host setPaused:hidden];
    QPStatus[@"managerForeground"]=@(self.managerActive); QPStatus[@"managerExplicitMenu"]=@(self.managerOverride); QPWriteStatus();
}
- (void)stop:(NSString *)reason {
    if (QPStopping) return; QPStopping=YES;
    [self.control invalidate]; [self.orientation invalidate]; QPResetCapturedTouches();
    QPSetOutsideTouchHandler(nil);
    if (self.lockNotify>=0) notify_cancel(self.lockNotify); if (self.bootNotify>=0) notify_cancel(self.bootNotify);
    [self.host invalidate]; self.window.hidden=YES; [self.server stop];
    if (self.pendingReply) self.pendingReply(nil,@"HUD stopped before the manager operation completed.");
    QPStatus[@"phase"]=@"stopped"; QPStatus[@"stopReason"]=reason; QPWriteStatus();
    if (QPLock>=0) { flock(QPLock,LOCK_UN); close(QPLock); QPLock=-1; }
    exit(QPStatus[@"fatalError"]?1:0);
}
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary *)options {
    if (QPHUD || ![url.scheme isEqual:@"qqpetios"] || ![url.host isEqual:@"manager"]) return NO;
    [self.manager poll]; return YES;
}
- (void)applicationDidBecomeActive:(UIApplication *)application { if (!QPHUD) [self.manager poll]; }
- (void)applicationDidEnterBackground:(UIApplication *)application {
    if (!QPHUD) [QPStorage writeJSON:@{@"active":@NO,@"pid":@(getpid()),@"updatedAt":@(NSDate.date.timeIntervalSince1970)} name:@"manager.json" error:NULL];
}
@end

int main(int argc,char *argv[]) {
    @autoreleasepool {
        NSString *directory=NSProcessInfo.processInfo.environment[@"QQPET_STATE_DIR"];
        NSString *control=nil;
        for (int i=1;i<argc;i++) {
            NSString *arg=@(argv[i]);
            if ([arg isEqual:@"--hud"]) QPHUD=YES;
            else if ([arg isEqual:@"--state-dir"]&&i+1<argc) directory=@(argv[++i]);
            else if ([arg isEqual:@"--duration"]&&i+1<argc) { QPDuration=atof(argv[++i]); if (!isfinite(QPDuration)||QPDuration<=0) return 2; }
            else if ([arg isEqual:@"--status"]||[arg isEqual:@"--quit"]) control=arg;
            else if ([arg isEqual:@"--help"]) { puts("QQPet [--hud] [--duration seconds] [--state-dir directory] | --status | --quit\nNormal use: open QQPet and tap Start. No launch daemon is installed."); return 0; }
        }
        NSError *error=nil;
        QPStorage=[[QPState alloc] initWithDirectory:directory ?: QPDefaultStateDirectory() error:&error];
        if (!QPStorage) { fprintf(stderr,"%s\n",error.localizedDescription.UTF8String); return 1; }
        if (control) {
            if ([control isEqual:@"--status"]) { NSString *status=[QPStorage readText:@"hud.json"]; if (status) puts(status.UTF8String); return status?0:1; }
            NSDictionary *status=[QPStorage readJSON:@"hud.json"];
            return [QPStorage enqueueCommand:@{@"op":@"quit"} instance:status[@"instance"] error:&error]?0:1;
        }
        if (!QPHUD) return UIApplicationMain(argc,argv,nil,NSStringFromClass(QPAppDelegate.class));
        QPLock=open([QPStorage path:@"hud.lock"].fileSystemRepresentation,O_CREAT|O_RDWR|O_NOFOLLOW,0600);
        if (QPLock<0||flock(QPLock,LOCK_EX|LOCK_NB)) { fprintf(stderr,"HUD already running or state lock unavailable.\n"); return 1; }
        if (getuid()==0) fchown(QPLock,QPStorage.owner,(gid_t)-1);
        QPInstance=NSUUID.UUID.UUIDString;
        QPStatus=[@{@"instance":QPInstance,@"pid":@(getpid()),@"uid":@(getuid()),@"stateDir":QPStorage.directory,@"phase":@"starting",@"startedAt":@(NSDate.date.timeIntervalSince1970),@"os":NSProcessInfo.processInfo.operatingSystemVersionString} mutableCopy]; QPWriteStatus();
        if (!QPLoadPrivateAPI(&error)) { QPStatus[@"phase"]=@"stopped"; QPStatus[@"fatalError"]=error.localizedDescription; QPWriteStatus(); return 1; }
        [UIScreen initialize]; CFRunLoopGetCurrent(); QPPrivate.graphicsInitialize(); QPPrivate.startDisplay(); QPPrivate.initializeApplication();
        QPPrivate.instantiateApplication(QPHUDApplication.class); QPDelegate=[QPAppDelegate new]; UIApplication.sharedApplication.delegate=QPDelegate;
        [UIApplication.sharedApplication _accessibilityInit];
        // Scroll views switch to UITrackingRunLoopMode through GraphicsServices,
        // including on iOS 14. Initialize its run loop before any HUD gestures.
        // The HUD already receives BackBoard HID events; iOS 14's application
        // initializer tries to register a legacy Purple port outside launchd.
        if (NSProcessInfo.processInfo.operatingSystemVersion.majorVersion < 15) QPPrivate.initializeExtensionEvents();
        else QPPrivate.initializeEvents(0);
        QPPrivate.pushEventMode(kCFRunLoopDefaultMode);
        [UIApplication.sharedApplication __completeAndRunAsPlugin];
        // A mode push stops the current CF loop. GraphicsServices resumes it in
        // the tracking/default mode at the top of its stack instead of exiting.
        QPPrivate.runEvents(); return 0;
    }
}
