#import "QPHostController.h"
#import "QPEventBridge.h"
#import "QPSystemTextInput.h"
#import "QPAudioOutput.h"
#import "QPMemoryPolicy.h"
#import <math.h>

// Read-only getter in Safari 610 / 612; it forwards to the content view's
// application-state tracker and does not acquire a process assertion.
// https://github.com/WebKit/WebKit/blob/Safari-610.1.28.1.9/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm#L264
// https://github.com/WebKit/WebKit/blob/Safari-612.1.29.41.4/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm#L271
@interface WKWebView (QPRuntimeState)
- (BOOL)_isBackground;
@end

// Safari 610 keeps the old layer tree until the resized WebContent frame commits.
// https://github.com/WebKit/WebKit/blob/Safari-610.1.28.1.9/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm
@interface WKWebView (QPViewportTransition)
- (void)_resizeWhileHidingContentWithUpdates:(void (^)(void))updates;
- (void)_setInterfaceOrientationOverride:(UIInterfaceOrientation)orientation;
- (void)_doAfterNextPresentationUpdate:(void (^)(void))completion;
- (void)_cancelAnimatedResize;
@end

// Feature keys come from WebKit's UnifiedWebPreferences.yaml. Enumerate the
// running WebKit rather than relying on private properties in a newer SDK.
@interface WKPreferences (QPRenderingFeatures)
+ (NSArray *)_features;
+ (NSArray *)_experimentalFeatures;
- (BOOL)_isEnabledForFeature:(id)feature;
- (void)_setEnabled:(BOOL)enabled forFeature:(id)feature;
@end
@protocol QPRenderingFeature <NSObject>
- (NSString *)key;
@end
static NSDictionary *QPConfigureRendering(WKPreferences *preferences) {
    NSArray *features=nil;
    if ([WKPreferences respondsToSelector:@selector(_features)]) features=[WKPreferences _features];
    else if ([WKPreferences respondsToSelector:@selector(_experimentalFeatures)]) features=[WKPreferences _experimentalFeatures];
    if (![features isKindOfClass:NSArray.class] || ![preferences respondsToSelector:@selector(_setEnabled:forFeature:)] || ![preferences respondsToSelector:@selector(_isEnabledForFeature:)]) return @{@"applied":@NO};
    NSArray *keys=@[@"UseGPUProcessForCanvasRenderingEnabled",@"UseGPUProcessForDOMRenderingEnabled",@"UseGPUProcessForWebGLEnabled"];
    NSMutableDictionary *matched=[NSMutableDictionary new];
    for (id<QPRenderingFeature> feature in features) {
        if (![feature respondsToSelector:@selector(key)]) continue;
        NSString *key=feature.key;
        if ([keys containsObject:key]) matched[key]=feature;
    }
    // The root HUD on iOS 16 reads empty remote ImageBuffers. Keep all drawing
    // paths in WebContent: a remote WebGL context cannot paint to a local 2D
    // destination in this WebKit implementation. WebGL itself stays enabled.
    if (matched.count!=keys.count) return @{@"applied":@NO};
    NSMutableDictionary *before=[NSMutableDictionary new], *result=[NSMutableDictionary new];
    for (NSString *key in keys) before[key]=@([preferences _isEnabledForFeature:matched[key]]);
    for (NSString *key in keys) [preferences _setEnabled:NO forFeature:matched[key]];
    BOOL applied=YES;
    for (NSString *key in keys) if ([preferences _isEnabledForFeature:matched[key]]) applied=NO;
    if (!applied) for (NSString *key in keys) [preferences _setEnabled:[before[key] boolValue] forFeature:matched[key]];
    for (NSString *key in keys) result[key]=@{@"before":before[key],@"after":@([preferences _isEnabledForFeature:matched[key]])};
    return @{@"applied":@(applied),@"features":result};
}

static NSString *QPJSON(id value) {
    NSData *data = [NSJSONSerialization dataWithJSONObject:value ?: NSNull.null options:NSJSONWritingFragmentsAllowed error:NULL];
    return data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : @"null";
}
static CGRect QPBox(NSDictionary *box) { return CGRectMake([box[@"x"] doubleValue],[box[@"y"] doubleValue],[box[@"width"] doubleValue],[box[@"height"] doubleValue]); }
static NSDictionary *QPRectState(CGRect rect) { return @{@"x":@(rect.origin.x),@"y":@(rect.origin.y),@"width":@(rect.size.width),@"height":@(rect.size.height)}; }
static NSDictionary *QPSizeState(CGSize size) { return @{@"width":@(size.width),@"height":@(size.height)}; }
static CGSize QPViewportSize(UIInterfaceOrientation orientation) {
    CGSize fixed=UIScreen.mainScreen.fixedCoordinateSpace.bounds.size;
    return UIInterfaceOrientationIsLandscape(orientation)?CGSizeMake(fixed.height,fixed.width):fixed;
}
// UIInterfaceOrientation uses the opposite landscape names to UIDeviceOrientation.
// These angles follow the pinned TrollSpeed HUDRootViewController orientationAngle.
static CGFloat QPOrientationAngle(UIInterfaceOrientation orientation) {
    if (orientation==UIInterfaceOrientationLandscapeLeft) return -M_PI_2;
    if (orientation==UIInterfaceOrientationLandscapeRight) return M_PI_2;
    if (orientation==UIInterfaceOrientationPortraitUpsideDown) return M_PI;
    return 0;
}

@class QPDragPlane;
@interface QPTransparentRootView : UIView
@property(nonatomic, weak) QPDragPlane *dragPlane;
@end

@class QPHostController;
@interface QPDragPlane : UIView
@property(nonatomic, weak) QPHostController *host;
@property(nonatomic, copy) NSArray *dragRegions;
@property(nonatomic, copy) NSArray *interactiveRegions;
@end
@implementation QPTransparentRootView
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    if (self.dragPlane) {
        // WK's content view fills the crop, including transparent gaps between
        // the pet and its panels. Only the pet host installs this input filter.
        CGPoint local=[self.dragPlane convertPoint:point fromView:self];
        BOOL inside=NO;
        for (NSDictionary *box in self.dragPlane.interactiveRegions) if (CGRectContainsPoint(QPBox(box),local)) { inside=YES; break; }
        if (!inside) for (NSDictionary *box in self.dragPlane.dragRegions) if (CGRectContainsPoint(QPBox(box),local)) { inside=YES; break; }
        if (!inside) return nil;
    }
    UIView *hit=[super hitTest:point withEvent:event];
    return hit==self ? nil : hit;
}
@end
@interface QPHostController () <WKScriptMessageHandler,WKNavigationDelegate>
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, strong) UIView *viewport;
@property(nonatomic, strong) UIView *cropView;
@property(nonatomic, strong) QPDragPlane *dragPlane;
@property(nonatomic, strong) QPState *state;
@property(nonatomic, strong) QQAssetServer *server;
@property(nonatomic, copy) NSString *role;
@property(nonatomic) UIInterfaceOrientation orientation;
@property(nonatomic) CGSize cssSize;
@property(nonatomic) CGRect crop;
@property(nonatomic, strong) NSURLSession *session;
@property(nonatomic, strong) NSMutableDictionary<NSString *,NSURLSessionTask *> *network;
@property(nonatomic, strong) NSMutableDictionary<NSValue *,NSNumber *> *pointerIDs;
@property(nonatomic) NSInteger nextPointer;
@property(nonatomic) NSUInteger crashes;
@property(nonatomic) BOOL invalidated;
@property(nonatomic) BOOL rendererFailed;
@property(nonatomic, copy) NSDictionary *firstRufflePanic;
@property(nonatomic) NSInteger flushID;
@property(nonatomic) BOOL paused;
@property(nonatomic) BOOL resizing;
@property(nonatomic) NSUInteger resizeGeneration;
@property(nonatomic, copy) NSString *flushError;
@property(nonatomic, copy) void (^flushCompletion)(void);
@property(nonatomic, strong) NSMutableArray *flushWaiters;
@property(nonatomic, strong) NSMutableSet<NSString *> *deferredManagerRequests;
@property(nonatomic, strong) QPMemoryPolicy *processPolicy;
@property(nonatomic, strong) QPAudioOutput *audioOutput;
@property(nonatomic, copy) NSDictionary *renderingPolicy;
@property(nonatomic) NSUInteger audioGeneration;
@property(nonatomic, copy) NSDictionary *lastProcessPolicy;
@property(nonatomic, copy) NSString *currentPage;
@property(nonatomic, strong) QPSystemTextInput *textInput;
@property(nonatomic, copy) NSDictionary *textInputRequest;
@property(nonatomic, copy) void (^textInputReply)(id,NSString *);
- (void)sendTouches:(NSSet<UITouch *> *)touches phase:(NSString *)phase;
- (void)cancelTextInput:(NSNumber *)request page:(NSString *)page;
- (void)finishTextInput:(NSNumber *)request page:(NSString *)page value:(id)value error:(NSString *)error;
@end

@implementation QPDragPlane
- (BOOL)pointInside:(CGPoint)point withEvent:(UIEvent *)event {
    for (NSDictionary *box in self.interactiveRegions) if (CGRectContainsPoint(QPBox(box),point)) return NO;
    for (NSDictionary *box in self.dragRegions) if (CGRectContainsPoint(QPBox(box),point)) return YES;
    return NO;
}
- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event { [self.host sendTouches:touches phase:@"begin"]; }
- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event { [self.host sendTouches:touches phase:@"move"]; }
- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event { [self.host sendTouches:touches phase:@"end"]; }
- (void)touchesCancelled:(NSSet *)touches withEvent:(UIEvent *)event { [self.host sendTouches:touches phase:@"cancel"]; }
@end

@implementation QPHostController
- (instancetype)initWithState:(QPState *)state server:(QQAssetServer *)server role:(NSString *)role {
    if ((self=[super init])) {
        _state=state; _server=server; _role=[role copy];
        _network=[NSMutableDictionary new]; _pointerIDs=[NSMutableDictionary new]; _flushWaiters=[NSMutableArray new]; _deferredManagerRequests=[NSMutableSet new];
        if ([role isEqual:@"pet"]) _processPolicy=[QPMemoryPolicy new];
        _session=[NSURLSession sessionWithConfiguration:NSURLSessionConfiguration.ephemeralSessionConfiguration];
        _orientation=UIInterfaceOrientationPortrait;
        _cssSize=UIScreen.mainScreen.fixedCoordinateSpace.bounds.size;
        _crop=CGRectMake(0,0,_cssSize.width,_cssSize.height);
    }
    return self;
}
- (void)loadView {
    self.view=[QPTransparentRootView new]; self.view.backgroundColor=UIColor.clearColor; self.view.opaque=NO; self.view.clipsToBounds=YES;
    self.cropView=[[UIView alloc] initWithFrame:CGRectMake(0,0,self.cssSize.width,self.cssSize.height)];
    self.cropView.backgroundColor=UIColor.clearColor; self.cropView.opaque=NO; self.cropView.clipsToBounds=YES;
    [self.view addSubview:self.cropView];
    self.viewport=[[UIView alloc] initWithFrame:CGRectMake(0,0,self.cssSize.width,self.cssSize.height)];
    [self.cropView addSubview:self.viewport];
    WKWebViewConfiguration *config=[WKWebViewConfiguration new];
    if (NSProcessInfo.processInfo.operatingSystemVersion.majorVersion==16 && [self.role isEqual:@"pet"])
        self.renderingPolicy=QPConfigureRendering(config.preferences);
    config.allowsInlineMediaPlayback=YES; config.mediaTypesRequiringUserActionForPlayback=WKAudiovisualMediaTypeNone;
    self.audioOutput=[QPAudioOutput new];
    [self.audioOutput setHostPaused:self.paused];
    // Apply before Ruffle in every document, including its separate SWF frames.
    NSURL *audioPolicyURL=[NSBundle.mainBundle URLForResource:@"audio-policy" withExtension:@"js"];
    NSError *audioPolicyError=nil;
    NSString *audioPolicy=audioPolicyURL?[NSString stringWithContentsOfURL:audioPolicyURL encoding:NSUTF8StringEncoding error:&audioPolicyError]:nil;
    if (audioPolicy) {
        [config.userContentController addUserScript:[[WKUserScript alloc] initWithSource:audioPolicy injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:NO]];
    } else {
        NSLog(@"QQPet audio policy unavailable: %@",audioPolicyError.localizedDescription);
        // A missing resource must not fall back to WebKit's interrupting output.
        NSString *blocked=@"window.__qqpetRespectSystemAudio=true;window.__qqpetAudioPolicyState='script-unavailable';window.AudioContext=window.webkitAudioContext=function(){throw new Error('QQPet native audio script unavailable')};";
        [config.userContentController addUserScript:[[WKUserScript alloc] initWithSource:blocked injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:NO]];
    }
    [config.userContentController addScriptMessageHandler:self name:@"qqpetAudio"];
    [config.userContentController addScriptMessageHandler:self name:@"qqpet"];
    self.webView=[[WKWebView alloc] initWithFrame:self.viewport.bounds configuration:config];
    self.webView.navigationDelegate=self; self.webView.opaque=NO; self.webView.backgroundColor=UIColor.clearColor;
    self.webView.scrollView.backgroundColor=UIColor.clearColor; self.webView.scrollView.scrollEnabled=NO; self.webView.scrollView.bounces=NO;
    self.webView.scrollView.contentInsetAdjustmentBehavior=UIScrollViewContentInsetAdjustmentNever;
    self.webView.multipleTouchEnabled=YES; self.webView.scrollView.multipleTouchEnabled=YES;
    [self.viewport addSubview:self.webView];
    if ([self.role isEqual:@"pet"]) {
        self.dragPlane=[[QPDragPlane alloc] initWithFrame:self.viewport.bounds];
        self.dragPlane.host=self; self.dragPlane.backgroundColor=UIColor.clearColor; self.dragPlane.multipleTouchEnabled=YES;
        [self.viewport addSubview:self.dragPlane];
        ((QPTransparentRootView *)self.view).dragPlane=self.dragPlane;
    }
}
- (void)loadURL:(NSURL *)url { [self loadViewIfNeeded]; [self.webView loadRequest:[NSURLRequest requestWithURL:url]]; }
- (void)evaluate:(NSString *)script { if (!self.invalidated) [self.webView evaluateJavaScript:script completionHandler:nil]; }
- (void)emit:(NSString *)event value:(id)value { [self evaluate:[NSString stringWithFormat:@"window.__qqpetIOS&&window.__qqpetIOS.emit(%@,%@)",QPJSON(event),QPJSON(value)]]; }
- (void)resolve:(NSNumber *)request value:(id)value error:(NSString *)error page:(NSString *)page {
    if (!request || request.integerValue==0) return;
    [self evaluate:[NSString stringWithFormat:@"window.__qqpetIOS&&window.__qqpetIOS.page===%@&&window.__qqpetIOS.resolve(%@,%@,%@,%@)",QPJSON(page),request,QPJSON(value),QPJSON(error),QPJSON(page)]];
}
- (void)sendTouches:(NSSet<UITouch *> *)touches phase:(NSString *)phase {
    for (UITouch *touch in touches) {
        NSValue *key=[NSValue valueWithNonretainedObject:touch];
        NSNumber *identity=self.pointerIDs[key];
        if ([phase isEqual:@"begin"]) { identity=@(++self.nextPointer); self.pointerIDs[key]=identity; }
        if (!identity) continue;
        CGPoint point=[touch locationInView:self.viewport];
        // No native timestamp: JavaScript's input clock is performance.now().
        [self emit:@"pointer" value:@{@"phase":phase,@"id":identity,@"x":@(point.x),@"y":@(point.y)}];
        [self emit:@"cursor" value:@{@"x":@(point.x),@"y":@(point.y)}];
        if ([phase isEqual:@"end"] || [phase isEqual:@"cancel"]) [self.pointerIDs removeObjectForKey:key];
    }
}
- (void)setPaused:(BOOL)paused {
    paused=paused||self.rendererFailed;
    BOOL changed=_paused!=paused;
    _paused=paused;
    [self.audioOutput setHostPaused:paused];
    if (paused) { QPResetCapturedTouches(); [self.pointerIDs removeAllObjects]; }
    [self emit:@"paused" value:@(paused)];
    if (changed) [self emit:@"presence" value:@(paused)];
    [self updateProcessPolicy];
    [self applyGeometry];
}
- (void)updateProcessPolicy {
    NSDictionary *policy=[self.processPolicy updateWithWebView:self.webView active:!self.paused&&!self.invalidated];
    NSMutableDictionary *status=[@{@"mediaAudioProcess":@"native-audioqueue",@"nativeAudio":self.audioOutput.status ?: @{}} mutableCopy];
    if (self.renderingPolicy) status[@"renderingPolicy"]=self.renderingPolicy;
    if (policy) status[@"processPolicy"]=policy;
    BOOL supportsBackground=[self.webView respondsToSelector:@selector(_isBackground)];
    UIApplicationState applicationState=UIApplication.sharedApplication.applicationState;
    NSString *applicationStateName=applicationState==UIApplicationStateActive?@"active":(applicationState==UIApplicationStateInactive?@"inactive":(applicationState==UIApplicationStateBackground?@"background":@"unknown"));
    UIWindow *window=self.webView.window;
    status[@"webViewState"]=@{
        @"isBackgroundSupported":@(supportsBackground),
        @"isBackground":supportsBackground?@(self.webView._isBackground):(id)NSNull.null,
        @"applicationState":applicationStateName,@"applicationStateRaw":@(applicationState),
        @"bounds":QPRectState(self.webView.bounds),
        @"scrollViewBounds":QPRectState(self.webView.scrollView.bounds),@"zoomScale":@(self.webView.scrollView.zoomScale),
        @"cssSize":QPSizeState(self.cssSize),@"crop":QPRectState(self.crop),
        @"hidden":@(self.webView.hidden),@"inWindow":@(window!=nil),@"windowHidden":window?@(window.hidden):(id)NSNull.null,
        @"paused":@(self.paused)
    };
    if (![status isEqual:self.lastProcessPolicy]) {
        self.lastProcessPolicy=status;
        if (self.statusChanged) self.statusChanged(status);
    }
}
- (CGRect)physicalCrop {
    CGRect r=self.crop; CGSize physical=UIScreen.mainScreen.fixedCoordinateSpace.bounds.size;
    if (self.orientation==UIInterfaceOrientationLandscapeLeft) return CGRectMake(r.origin.y,physical.height-CGRectGetMaxX(r),r.size.height,r.size.width);
    if (self.orientation==UIInterfaceOrientationLandscapeRight) return CGRectMake(physical.width-CGRectGetMaxY(r),r.origin.x,r.size.height,r.size.width);
    if (self.orientation==UIInterfaceOrientationPortraitUpsideDown) return CGRectMake(physical.width-CGRectGetMaxX(r),physical.height-CGRectGetMaxY(r),r.size.width,r.size.height);
    return r;
}
- (void)applyGeometry {
    if (![self.role isEqual:@"pet"] || !self.view.window || self.cssSize.width<=0) return;
    CGRect fixed=UIScreen.mainScreen.fixedCoordinateSpace.bounds;
    CGFloat angle=QPOrientationAngle(self.orientation);
    CGPoint center=CGPointMake(CGRectGetMidX(fixed),CGRectGetMidY(fixed));
    CGRect crop=[self physicalCrop];
    CGRect reserved=self.managerReservedRect;
    // Explicit pet panels leave the manager's navigation controls reachable.
    if (!CGRectIsEmpty(reserved)&&CGRectIntersectsRect(crop,reserved)) {
        if (reserved.size.width>=fixed.size.width-1) {
            CGFloat end=CGRectGetMaxY(crop); crop.origin.y=MAX(crop.origin.y,CGRectGetMaxY(reserved)); crop.size.height=MAX(0,end-crop.origin.y);
        } else if (reserved.size.height>=fixed.size.height-1) {
            if (reserved.origin.x<fixed.size.width/2) { CGFloat end=CGRectGetMaxX(crop); crop.origin.x=MAX(crop.origin.x,CGRectGetMaxX(reserved)); crop.size.width=MAX(0,end-crop.origin.x); }
            else crop.size.width=MAX(0,MIN(CGRectGetMaxX(crop),reserved.origin.x)-crop.origin.x);
        }
    }
    // Keep the hosted display context stable. Clip content inside that context
    // instead of resizing its UIWindow during UIKit touch/gesture delivery.
    if (!CGRectEqualToRect(self.view.window.frame,fixed)) self.view.window.frame=fixed;
    // The global HUD sits above SpringBoard's system input alert. Hide its
    // display context while editing so both the alert and keyboard are visible.
    self.view.window.hidden=self.paused||self.textInputRequest!=nil;
    self.view.window.userInteractionEnabled=!self.paused&&!self.invalidated&&!self.textInputRequest&&!self.resizing;
    self.cropView.hidden=CGRectIsEmpty(crop);
    self.cropView.frame=crop;
    self.viewport.transform=CGAffineTransformIdentity;
    self.viewport.bounds=CGRectMake(0,0,self.cssSize.width,self.cssSize.height);
    self.webView.frame=self.viewport.bounds; self.dragPlane.frame=self.viewport.bounds;
    self.viewport.center=CGPointMake(center.x-crop.origin.x,center.y-crop.origin.y);
    self.viewport.transform=CGAffineTransformMakeRotation(angle);
}
- (void)updateOrientation:(UIInterfaceOrientation)orientation {
    // Foreground game controllers keep UIKit's own bounds and rotation lifecycle.
    if (![self.role isEqual:@"pet"] || !(UIInterfaceOrientationIsPortrait(orientation)||UIInterfaceOrientationIsLandscape(orientation))) return;
    CGSize size=QPViewportSize(orientation);
    if (orientation==self.orientation && CGSizeEqualToSize(size,self.cssSize)) return;
    QPResetCapturedTouches(); [self.pointerIDs removeAllObjects];
    [self emit:@"pointer" value:@{@"phase":@"cancel",@"id":@(-1),@"x":@0,@"y":@0}];
    self.orientation=orientation;
    self.cssSize=size;
    self.crop=CGRectMake(0,0,self.cssSize.width,self.cssSize.height);
    self.dragPlane.dragRegions=@[]; self.dragPlane.interactiveRegions=@[];
    NSUInteger generation=++self.resizeGeneration;
    WKWebView *webView=self.webView;
    BOOL coordinated=webView.URL && [webView respondsToSelector:@selector(_resizeWhileHidingContentWithUpdates:)] && [webView respondsToSelector:@selector(_setInterfaceOrientationOverride:)] && [webView respondsToSelector:@selector(_doAfterNextPresentationUpdate:)] && [webView respondsToSelector:@selector(_cancelAnimatedResize)];
    self.resizing=coordinated;
    if (coordinated) {
        // New native bounds must not display the previous direction's fixed/CSS-
        // rotated panels. WK waits for its matching viewport commit, without
        // pausing JavaScript or requiring a client-side endAnimatedResize call.
        [webView _resizeWhileHidingContentWithUpdates:^{
            [webView _setInterfaceOrientationOverride:orientation];
            [self applyGeometry];
        }];
        __weak QPHostController *weakSelf=self;
        void (^finish)(void)=^{
            QPHostController *host=weakSelf;
            if (!host || host.invalidated || generation!=host.resizeGeneration) return;
            host.resizing=NO; [host applyGeometry];
        };
        [webView _doAfterNextPresentationUpdate:finish];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW,3*NSEC_PER_SEC),dispatch_get_main_queue(),^{
            QPHostController *host=weakSelf;
            if (!host || host.invalidated || generation!=host.resizeGeneration || !host.resizing) return;
            // A suspended/terminated page must not leave input or WK's resize
            // container stuck. A later rotation's completion owns its own state.
            [host.webView _cancelAnimatedResize]; finish();
        });
    } else [self applyGeometry];
    [self emit:@"safeArea" value:nil];
}
- (void)setManagerReservedRect:(CGRect)rect {
    if (CGRectEqualToRect(rect,_managerReservedRect)) return;
    _managerReservedRect=rect; [self applyGeometry];
    [self emit:@"safeArea" value:nil];
}
- (void)viewDidLayoutSubviews { [super viewDidLayoutSubviews]; if ([self.role isEqual:@"game"]) { self.cropView.frame=self.view.bounds; self.viewport.frame=self.cropView.bounds; self.webView.frame=self.viewport.bounds; } }
- (void)requestFlushThen:(void (^)(void))completion {
    if (self.flushCompletion) { [self.flushWaiters addObject:[completion copy]]; return; }
    self.flushID+=1; NSInteger request=self.flushID; self.flushCompletion=completion; self.flushError=nil;
    [self emit:@"flush" value:@{@"id":@(request)}];
    __weak QPHostController *weakSelf=self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,2*NSEC_PER_SEC),dispatch_get_main_queue(),^{
        QPHostController *host=weakSelf;
        if (host.flushID==request && host.flushCompletion) { host.flushError=@"Timed out flushing renderer save. Last acknowledged save is retained."; if (host.statusChanged) host.statusChanged(host.rendererFailed?@{@"flushError":host.flushError}:@{@"flushError":host.flushError,@"message":host.flushError}); [host finishFlush]; }
    });
}
- (void)failRenderer:(NSString *)message reason:(NSString *)reason panic:(NSDictionary *)panic {
    if (self.rendererFailed||self.invalidated) return;
    self.rendererFailed=YES;
    // Isolation precedes the save barrier: a broken canvas or stale drag must
    // never leave a system-wide hit target while JavaScript is unresponsive.
    if ([self.role isEqual:@"pet"]) { self.view.window.hidden=YES; self.view.window.userInteractionEnabled=NO; }
    else { self.webView.hidden=YES; self.webView.userInteractionEnabled=NO; }
    [self setPaused:YES];
    QPResetCapturedTouches(); [self.pointerIDs removeAllObjects];
    self.dragPlane.dragRegions=@[]; self.dragPlane.interactiveRegions=@[];
    self.crop=CGRectZero; [self applyGeometry];
    self.audioGeneration++; [self.audioOutput reset];
    [self cancelTextInput:nil page:self.currentPage];
    [self.deferredManagerRequests removeAllObjects];
    if (self.currentPage&&self.cancelManagerOperation) self.cancelManagerOperation(nil,self.currentPage);
    NSMutableDictionary *status=[@{@"state":@"error",@"fatalError":message,@"message":message} mutableCopy];
    if (panic) {
        if (!self.firstRufflePanic) self.firstRufflePanic=panic;
        status[@"lastRufflePanic"]=self.firstRufflePanic;
        status[@"fatalRufflePanic"]=panic;
    }
    if (self.statusChanged) self.statusChanged(status);
    NSLog(@"QQPet Ruffle runtime isolated (%@)",self.role);
    if ([self.role isEqual:@"pet"]) {
        __weak QPHostController *weakSelf=self;
        [self requestFlushThen:^{
            QPHostController *host=weakSelf;
            if (!host.invalidated&&host.stopRequested) host.stopRequested(reason);
        }];
    } else {
        // A foreground game shares the manager's UIWindow. Leave its native
        // navigation and End button usable instead of hiding that window.
        UILabel *label=[[UILabel alloc] initWithFrame:self.view.bounds];
        label.autoresizingMask=UIViewAutoresizingFlexibleWidth|UIViewAutoresizingFlexibleHeight;
        label.text=@"Flash 运行发生错误。\n请结束此小游戏后重试。";
        label.numberOfLines=0; label.textAlignment=NSTextAlignmentCenter; label.textColor=UIColor.whiteColor;
        [self.view addSubview:label];
    }
}
- (void)cancelTextInput:(NSNumber *)request page:(NSString *)page {
    if (!self.textInputRequest || (request&&![self.textInputRequest[@"id"] isEqual:request]) || (page&&![self.textInputRequest[@"page"] isEqual:page])) return;
    [self.textInput cancel]; self.textInput=nil; self.textInputRequest=nil; self.textInputReply=nil;
    [self applyGeometry];
}
- (void)finishTextInput:(NSNumber *)request page:(NSString *)page value:(id)value error:(NSString *)error {
    if (![self.textInputRequest[@"id"] isEqual:request] || ![self.textInputRequest[@"page"] isEqual:page]) return;
    void (^reply)(id,NSString *)=self.textInputReply;
    [self cancelTextInput:request page:page];
    if (reply) reply(value,error);
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqual:@"qqpetAudio"]) {
        if (self.invalidated || self.rendererFailed || ![message.frameInfo.securityOrigin.protocol isEqual:@"http"] || ![message.frameInfo.securityOrigin.host isEqual:@"127.0.0.1"] || message.frameInfo.securityOrigin.port!=self.server.port || ![message.body isKindOfClass:NSDictionary.class]) return;
        // Audio also runs in local game iframes. Replies belong to the exact
        // originating frame and document, never to the top-level renderer.
        WKFrameInfo *frame=message.frameInfo;
        NSUInteger generation=self.audioGeneration;
        __weak QPHostController *weakSelf=self;
        [self.audioOutput handleMessage:message.body reply:^(NSDictionary *event) {
            dispatch_async(dispatch_get_main_queue(),^{
                QPHostController *host=weakSelf;
                if (!host || host.invalidated || host.audioGeneration!=generation) return;
                NSString *script=[NSString stringWithFormat:@"window.__qqpetNativeAudioReceive&&window.__qqpetNativeAudioReceive(%@)",QPJSON(event)];
                [host.webView evaluateJavaScript:script inFrame:frame inContentWorld:WKContentWorld.pageWorld completionHandler:nil];
            });
        }];
        return;
    }
    if (!message.frameInfo.isMainFrame || ![message.frameInfo.securityOrigin.host isEqual:@"127.0.0.1"] || message.frameInfo.securityOrigin.port!=self.server.port || ![message.body isKindOfClass:NSDictionary.class]) return;
    NSDictionary *body=message.body; NSNumber *request=body[@"id"]; NSString *op=body[@"op"], *page=body[@"page"]; NSDictionary *args=body[@"args"];
    if (![request isKindOfClass:NSNumber.class] || ![op isKindOfClass:NSString.class] || ![page isKindOfClass:NSString.class] || !page.length || ![args isKindOfClass:NSDictionary.class]) return;
    if ([op isEqual:@"bootstrap"]) {
        if (self.currentPage&&![self.currentPage isEqual:page]) [self cancelTextInput:nil page:self.currentPage];
        self.currentPage=page;
    }
    else if (![page isEqual:self.currentPage]) return;
    NSString *networkKey=[NSString stringWithFormat:@"%@/%@",page,request];
    __weak QPHostController *weakSelf=self;
    void (^reply)(id,NSString *)=^(id value,NSString *error){ dispatch_async(dispatch_get_main_queue(),^{ [weakSelf resolve:request value:value error:error page:page]; }); };
    // Only the existing persistence barrier may finish after a fatal runtime
    // error. Stale focus, editor or game requests cannot reopen the HUD.
    if (self.rendererFailed&&![@[@"writeSave",@"flushReady",@"cancel",@"status",@"rufflePanic",@"swfTerminalFailure",@"quit"] containsObject:op]) { reply(nil,@"The Flash runtime has stopped. Restart it from the manager."); return; }
    if ([op isEqual:@"bootstrap"]) {
        NSDictionary *capabilities=@{@"autoStart":@NO,@"autoStartReason":@"iOS 版由管理 App 手动启动，不安装后台守护程序。",@"clipboardWatch":@NO,@"frontWatch":@NO};
        UIUserInterfaceIdiom idiom=UIDevice.currentDevice.userInterfaceIdiom;
        NSString *deviceKind=idiom==UIUserInterfaceIdiomPad?@"tablet":(idiom==UIUserInterfaceIdiomPhone?@"phone":@"other");
        dispatch_async(self.state.fileQueue,^{ reply(@{@"save":[self.state readText:@"save.json"] ?: (id)NSNull.null,@"generation":self.state.generation,@"capabilities":capabilities,@"deviceKind":deviceKind},nil); });
    } else if ([@[@"writeSave",@"replaceSave",@"preserveCorrupt"] containsObject:op]) {
        if (![self.role isEqual:@"pet"]) { reply(nil,@"Only the pet renderer can write canonical save data."); return; }
        NSString *generation=args[@"generation"], *text=args[@"text"];
        if (![generation isKindOfClass:NSString.class] || ![text isKindOfClass:NSString.class]) { reply(nil,@"Invalid save request."); return; }
        if (![op isEqual:@"preserveCorrupt"]) {
            id parsed=[NSJSONSerialization JSONObjectWithData:[text dataUsingEncoding:NSUTF8StringEncoding] options:0 error:NULL];
            if (![parsed isKindOfClass:NSDictionary.class]) { reply(nil,@"Save content must be a JSON object."); return; }
        }
        dispatch_async(self.state.fileQueue,^{
            NSError *error=nil; id value=nil;
            if (![self.state matchesGeneration:generation]) error=QPError(@"Save generation changed. Reload before writing.");
            else if ([op isEqual:@"replaceSave"]) { NSString *next=[self.state replaceSave:text generation:generation backup:[args[@"backup"] boolValue] error:&error]; if (next) value=@{@"generation":next}; }
            else if ([op isEqual:@"preserveCorrupt"]) {
                NSString *name=args[@"name"]; if (![name isKindOfClass:NSString.class] || ![name hasPrefix:@"save.json.corrupt-"]) error=QPError(@"Invalid recovery filename."); else [self.state writeText:text name:name error:&error];
            } else {
                [self.state writeText:text name:@"save.json" error:&error];
                NSDictionary *save=[NSJSONSerialization JSONObjectWithData:[text dataUsingEncoding:NSUTF8StringEncoding] options:0 error:NULL];
                self.server.highResolution=[save[@"settings"][@"hd"] boolValue];
            }
            reply(value,error.localizedDescription);
        });
    } else if ([op isEqual:@"http"]) {
        NSURL *url=[NSURL URLWithString:args[@"url"] ?: @""];
        if (!([url.scheme isEqual:@"http"] || [url.scheme isEqual:@"https"])) { reply(nil,@"Only HTTP(S) network requests are supported."); return; }
        NSMutableURLRequest *networkRequest=[NSMutableURLRequest requestWithURL:url cachePolicy:NSURLRequestReloadIgnoringLocalCacheData timeoutInterval:90];
        networkRequest.HTTPMethod=args[@"method"] ?: @"GET";
        NSDictionary *headers=args[@"headers"]; if ([headers isKindOfClass:NSDictionary.class]) for (NSString *key in headers) if ([headers[key] isKindOfClass:NSString.class]) [networkRequest setValue:headers[key] forHTTPHeaderField:key];
        if ([args[@"body"] isKindOfClass:NSString.class]) networkRequest.HTTPBody=[args[@"body"] dataUsingEncoding:NSUTF8StringEncoding];
        NSURLSessionDataTask *task=[self.session dataTaskWithRequest:networkRequest completionHandler:^(NSData *data,NSURLResponse *response,NSError *error){
            dispatch_async(dispatch_get_main_queue(),^{ [weakSelf.network removeObjectForKey:networkKey]; });
            if (error) { reply(nil,error.localizedDescription); return; }
            NSString *text=[[NSString alloc] initWithData:data ?: [NSData data] encoding:NSUTF8StringEncoding];
            if (!text) { reply(nil,@"Network response is not UTF-8 text."); return; }
            NSHTTPURLResponse *http=(NSHTTPURLResponse *)response;
            reply(@{@"status":@(http.statusCode),@"body":text,@"headers":http.allHeaderFields ?: @{}},nil);
        }]; self.network[networkKey]=task; [task resume];
    } else if ([op isEqual:@"cancel"]) { NSString *key=[NSString stringWithFormat:@"%@/%@",page,args[@"requestId"]]; [self.network[key] cancel]; [self.network removeObjectForKey:key]; [self.deferredManagerRequests removeObject:key]; [self cancelTextInput:args[@"requestId"] page:page]; if (self.cancelManagerOperation) self.cancelManagerOperation(args[@"requestId"],page); }
    else if ([op isEqual:@"setGeometry"]) {
        if (self.rendererFailed||![self.role isEqual:@"pet"]) return;
        CGSize size=CGSizeMake([args[@"viewport"][@"width"] doubleValue],[args[@"viewport"][@"height"] doubleValue]);
        CGRect crop=QPBox(args[@"bounds"]);
        if (!isfinite(size.width)||!isfinite(size.height)||size.width<1||size.height<1||size.width>8192||size.height>8192) return;
        if (!isfinite(crop.origin.x)||!isfinite(crop.origin.y)||!isfinite(crop.size.width)||!isfinite(crop.size.height)) return;
        // The native full viewport owns its dimensions. A queued pre-rotation
        // crop must not resize WK back to the previous orientation.
        BOOL matchingViewport=fabs(size.width-self.cssSize.width)<=.5 && fabs(size.height-self.cssSize.height)<=.5;
        if (!matchingViewport) return;
        self.crop=CGRectIntersection(crop,CGRectMake(0,0,self.cssSize.width,self.cssSize.height));
        if (CGRectIsNull(self.crop)) self.crop=CGRectZero;
        self.dragPlane.dragRegions=[args[@"dragRegions"] isKindOfClass:NSArray.class]?args[@"dragRegions"]:@[];
        self.dragPlane.interactiveRegions=[args[@"interactiveRegions"] isKindOfClass:NSArray.class]?args[@"interactiveRegions"]:@[];
        [self applyGeometry];
    } else if ([op isEqual:@"safeArea"]) {
        UIEdgeInsets inset; CGFloat scale=1;
        if ([self.role isEqual:@"game"]) {
            inset=self.webView.safeAreaInsets;
            scale=[args[@"viewport"][@"width"] doubleValue]/MAX(1,self.webView.bounds.size.width);
        } else {
            NSDictionary *safe=[self.state readJSON:@"safe-area.json"];
            inset=UIEdgeInsetsMake([safe[@"top"] doubleValue],[safe[@"left"] doubleValue],[safe[@"bottom"] doubleValue],[safe[@"right"] doubleValue]);
            // The HUD clips out the manager's navigation bar. Fit panels into
            // that same available area instead of clipping their controls.
            CGRect reserved=CGRectIntersection(self.viewport.bounds,[self.viewport convertRect:self.managerReservedRect fromView:self.view.window]);
            if (!CGRectIsEmpty(self.managerReservedRect) && !CGRectIsNull(reserved)) {
                if (reserved.size.width>=self.cssSize.width-1) {
                    if (CGRectGetMinY(reserved)<=1) inset.top=MAX(inset.top,CGRectGetMaxY(reserved));
                    if (CGRectGetMaxY(reserved)>=self.cssSize.height-1) inset.bottom=MAX(inset.bottom,self.cssSize.height-CGRectGetMinY(reserved));
                } else if (reserved.size.height>=self.cssSize.height-1) {
                    if (CGRectGetMinX(reserved)<=1) inset.left=MAX(inset.left,CGRectGetMaxX(reserved));
                    if (CGRectGetMaxX(reserved)>=self.cssSize.width-1) inset.right=MAX(inset.right,self.cssSize.width-CGRectGetMinX(reserved));
                }
            }
        }
        reply(@{@"left":@(inset.left*scale),@"top":@(inset.top*scale),@"right":@(inset.right*scale),@"bottom":@(inset.bottom*scale)},nil);
    } else if ([op isEqual:@"setFocusable"]) { if (![args[@"enabled"] boolValue]) [self.webView endEditing:YES]; else [self.view.window makeKeyAndVisible]; reply(nil,nil); }
    else if ([op isEqual:@"setAlwaysOnTop"]) { self.view.window.windowLevel=[args[@"enabled"] boolValue]?10000010:UIWindowLevelNormal; reply(nil,nil); }
    else if ([op isEqual:@"setAutoStart"]) reply(@{@"enabled":@NO,@"reason":@"iOS 版只支持从管理 App 手动启动，不安装后台守护程序。"},nil);
    else if ([op isEqual:@"setTray"]) { if (self.statusChanged) self.statusChanged(@{@"tray":args}); reply(nil,nil); }
    else if ([op isEqual:@"status"]) {
        if (!self.rendererFailed&&self.statusChanged) {
            NSMutableDictionary *status=[args mutableCopy];
            NSDictionary *panic=args[@"lastRufflePanic"];
            if ([panic isKindOfClass:NSDictionary.class]) {
                if (!self.firstRufflePanic) self.firstRufflePanic=panic;
                status[@"lastRufflePanic"]=self.firstRufflePanic;
            }
            self.statusChanged(status);
        }
    }
    else if ([op isEqual:@"rufflePanic"]) {
        NSString *details=args[@"details"];
        if ([details isKindOfClass:NSString.class]&&details.length>0&&details.length<=32768)
            [self failRenderer:@"Flash 运行发生错误，桌宠已停止。请在 QQPet 管理界面重新启动。" reason:@"ruffle-panic" panic:args];
    }
    else if ([op isEqual:@"swfTerminalFailure"]) {
        NSString *terminal=args[@"terminal"], *url=args[@"url"], *message=args[@"message"];
        if (self.rendererFailed || ![terminal isKindOfClass:NSString.class] || ![@[@"context-recovery-failed",@"context-recovery-exhausted"] containsObject:terminal] ||
            ![url isKindOfClass:NSString.class] || url.length>8192 || ![message isKindOfClass:NSString.class] || !message.length || message.length>8192) return;
        [self failRenderer:@"Flash 画面恢复失败，桌宠已停止。请在 QQPet 管理界面重新启动。" reason:[@"swf-" stringByAppendingString:terminal] panic:nil];
        if (self.statusChanged) self.statusChanged(@{@"lastSWFError":args});
    }
    else if ([op isEqual:@"copyText"]) { UIPasteboard.generalPasteboard.string=args[@"text"]; reply(nil,nil); }
    else if ([op isEqual:@"openUrl"]) {
        NSURL *url=[NSURL URLWithString:args[@"url"] ?: @""];
        if (!([url.scheme isEqual:@"http"]||[url.scheme isEqual:@"https"])) { reply(nil,@"Only HTTP(S) external links are supported."); return; }
        [UIApplication.sharedApplication openURL:url options:@{} completionHandler:^(BOOL ok){ reply(@(ok),ok?nil:@"Could not open the system browser."); }];
    } else if ([op isEqual:@"flushReady"]) {
        if ([args[@"requestId"] integerValue]==self.flushID) {
            NSInteger completedRequest=self.flushID;
            if ([args[@"error"] isKindOfClass:NSString.class]) self.flushError=args[@"error"];
            else if (![self.state matchesGeneration:args[@"generation"]]) self.flushError=@"Save generation changed during flush.";
            if (self.flushError&&self.statusChanged) self.statusChanged(self.rendererFailed?@{@"flushError":self.flushError}:@{@"flushError":self.flushError,@"message":self.flushError});
            dispatch_async(self.state.fileQueue,^{ dispatch_async(dispatch_get_main_queue(),^{ if (self.flushID==completedRequest && self.flushCompletion) [self finishFlush]; }); });
        } reply(nil,nil);
    } else if ([op isEqual:@"quit"]) {
        if (![self.state matchesGeneration:args[@"generation"]]) { reply(nil,@"Save generation changed. Reload before quitting."); return; }
        reply(nil,nil); [self requestFlushThen:^{ if (self.stopRequested) self.stopRequested(@"renderer-quit"); }];
    } else if ([op isEqual:@"editText"]&&[self.role isEqual:@"pet"]) {
        NSString *text=args[@"text"],*placeholder=args[@"placeholder"],*type=args[@"type"];
        if (![text isKindOfClass:NSString.class]||text.length>200000||(![placeholder isKindOfClass:NSString.class]&&placeholder)) { reply(nil,@"Invalid editor text."); return; }
        if (self.textInputRequest) { reply(nil,@"请先完成当前文字输入。"); return; }
        self.textInputRequest=@{@"id":request,@"page":page}; self.textInputReply=reply;
        // The system alert and its keyboard own input; do not deliver their
        // touches to HUD controls underneath them.
        QPResetCapturedTouches(); [self applyGeometry];
        [self requestFlushThen:^{
            QPHostController *host=weakSelf;
            if (!host||host.invalidated||host.rendererFailed||![host.currentPage isEqual:page]||![host.textInputRequest[@"id"] isEqual:request]||![host.textInputRequest[@"page"] isEqual:page]) return;
            if (host.flushError) { [host finishTextInput:request page:page value:nil error:host.flushError]; return; }
            UIKeyboardType keyboard=UIKeyboardTypeDefault;
            if ([type isEqual:@"url"]) keyboard=UIKeyboardTypeURL;
            else if ([type isEqual:@"email"]) keyboard=UIKeyboardTypeEmailAddress;
            else if ([type isEqual:@"number"]) keyboard=UIKeyboardTypeDecimalPad;
            else if ([type isEqual:@"tel"]) keyboard=UIKeyboardTypePhonePad;
            host.textInput=[QPSystemTextInput new]; NSString *error=nil;
            BOOL shown=[host.textInput presentText:text placeholder:placeholder ?: @"" secure:[args[@"secure"] boolValue] keyboardType:keyboard completion:^(NSString *value,NSString *error){
                [weakSelf finishTextInput:request page:page value:value error:error];
            } error:&error];
            if (!shown) [host finishTextInput:request page:page value:nil error:error];
        }];
    } else if ([@[@"exportSave",@"importSave",@"openGame",@"closeGame",@"editText"] containsObject:op]) {
        if (!self.managerOperation) { reply(nil,@"Open the QQPet manager to complete this action."); return; }
        [self.deferredManagerRequests addObject:networkKey];
        void (^present)(void)=^{
            BOOL pending=[self.deferredManagerRequests containsObject:networkKey];
            [self.deferredManagerRequests removeObject:networkKey];
            if (!pending || self.invalidated || self.rendererFailed || ![self.currentPage isEqual:page]) return;
            if (self.flushError) reply(nil,self.flushError); else self.managerOperation(@{@"id":request,@"op":op,@"args":args,@"page":page},reply);
        };
        if ([self.role isEqual:@"pet"]) [self requestFlushThen:present]; else present();
    } else reply(nil,[@"Unsupported native operation: " stringByAppendingString:op]);
}
- (void)finishFlush {
    void (^finish)(void)=self.flushCompletion; self.flushCompletion=nil;
    NSArray *waiting=[self.flushWaiters copy]; [self.flushWaiters removeAllObjects];
    if (finish) finish(); for (void (^completion)(void) in waiting) completion();
}
- (void)webView:(WKWebView *)webView didStartProvisionalNavigation:(WKNavigation *)navigation {
    if (self.rendererFailed) return;
    self.audioGeneration++; [self.audioOutput reset];
    [self cancelTextInput:nil page:self.currentPage];
    if (self.currentPage && self.cancelManagerOperation) self.cancelManagerOperation(nil,self.currentPage);
    self.currentPage=nil; for (NSURLSessionTask *task in self.network.allValues) [task cancel]; [self.network removeAllObjects];
    [self updateProcessPolicy];
}
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation { [self applyGeometry]; [self setPaused:self.paused]; }
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))handler {
    NSURL *url=action.request.URL; handler(!self.rendererFailed&&[url.host isEqual:@"127.0.0.1"] && url.port.unsignedIntegerValue==self.server.port ? WKNavigationActionPolicyAllow:WKNavigationActionPolicyCancel);
}
- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error { if (!self.rendererFailed&&self.statusChanged) self.statusChanged(@{@"state":@"error",@"message":error.localizedDescription}); }
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    [self webContentTerminated:webView reason:-1];
}
// WebKit's iOS 12+ delegate SPI distinguishes resource limits from a crash.
// It replaces the public notification when implemented, so both use one recovery path.
- (void)_webView:(WKWebView *)webView webContentProcessDidTerminateWithReason:(NSInteger)reason {
    [self webContentTerminated:webView reason:reason];
}
- (void)webContentTerminated:(WKWebView *)webView reason:(NSInteger)reason {
    if (self.invalidated||self.rendererFailed) return;
    self.resizeGeneration++; self.resizing=NO;
    NSTimeInterval at=NSDate.date.timeIntervalSince1970;
    self.audioGeneration++; [self.audioOutput reset];
    [self cancelTextInput:nil page:self.currentPage];
    [self.processPolicy updateWithWebView:webView active:NO];
    NSArray *reasons=@[@"memory-limit",@"cpu-limit",@"client-request",@"crash"];
    NSString *kind=reason>=0 && reason<(NSInteger)reasons.count ? reasons[reason] : @"unknown";
    self.crashes++;
    NSDictionary *exit=@{@"at":@(at),@"reason":kind,@"rawReason":@(reason),@"paused":@(self.paused),@"crashes":@(self.crashes),@"role":self.role};
    if (self.statusChanged) self.statusChanged(@{@"state":@"error",@"message":[@"WebContent exited: " stringByAppendingString:kind],@"webContentTerminationReason":kind,@"crashes":@(self.crashes),@"lastWebContentExit":exit});
    if (self.crashes<=3&&!self.invalidated) [webView reload];
    else [self failRenderer:@"Flash 进程多次退出，桌宠已停止。请在 QQPet 管理界面重新启动。" reason:[@"webcontent-recovery-exhausted:" stringByAppendingString:kind] panic:nil];
}
- (UIInterfaceOrientationMask)supportedInterfaceOrientations { return [self.role isEqual:@"pet"]?UIInterfaceOrientationMaskPortrait:UIInterfaceOrientationMaskAll; }
- (BOOL)prefersStatusBarHidden { return [self.role isEqual:@"pet"]; }
- (BOOL)shouldAutorotate { return [self.role isEqual:@"game"]; }
- (void)invalidate {
    [self cancelTextInput:nil page:nil];
    self.invalidated=YES; [self.session invalidateAndCancel]; [self.network removeAllObjects]; [self.webView stopLoading];
    [self.processPolicy invalidate];
    self.audioGeneration++; [self.audioOutput invalidate];
    [self.webView.configuration.userContentController removeScriptMessageHandlerForName:@"qqpetAudio"];
    [self.webView.configuration.userContentController removeScriptMessageHandlerForName:@"qqpet"];
    [self.pointerIDs removeAllObjects]; self.flushCompletion=nil; [self.flushWaiters removeAllObjects]; [self.deferredManagerRequests removeAllObjects];
}
@end
