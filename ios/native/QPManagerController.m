#import "QPManagerController.h"
#import "QPLauncher.h"
#import <WebKit/WebKit.h>
#import <unistd.h>
#import "QPHostController.h"

@interface QPGameController : UIViewController
@property(nonatomic,strong) QPHostController *host;
@property(nonatomic,copy) void (^closed)(void);
@property(nonatomic) BOOL closing;
@end
@implementation QPGameController
- (void)viewDidLoad {
    [super viewDidLoad]; self.view.backgroundColor=UIColor.blackColor;
    [self addChildViewController:self.host]; self.host.view.translatesAutoresizingMaskIntoConstraints=NO;
    [self.view addSubview:self.host.view]; [self.host didMoveToParentViewController:self];
    UILayoutGuide *content=self.view.safeAreaLayoutGuide;
    [NSLayoutConstraint activateConstraints:@[
        [self.host.view.leadingAnchor constraintEqualToAnchor:content.leadingAnchor],
        [self.host.view.trailingAnchor constraintEqualToAnchor:content.trailingAnchor],
        [self.host.view.topAnchor constraintEqualToAnchor:content.topAnchor],
        [self.host.view.bottomAnchor constraintEqualToAnchor:content.bottomAnchor]
    ]];
    if (!self.title.length) self.title=@"小游戏";
    self.navigationItem.rightBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"结束" style:UIBarButtonItemStyleDone target:self action:@selector(closeGame)];
}
- (void)closeGame {
    if (self.closing) return;
    self.closing=YES; [self.host invalidate]; [self dismissViewControllerAnimated:YES completion:self.closed];
}
@end

@interface QPManagerController () <UIDocumentPickerDelegate>
@property(nonatomic,strong) QPState *state;
@property(nonatomic,strong) NSDictionary *status;
@property(nonatomic,strong) NSDictionary *pendingUI;
@property(nonatomic,strong) NSDictionary *pendingResponse;
@property(nonatomic,weak) UIViewController *pendingController;
@property(nonatomic,strong) NSTimer *timer;
@property(nonatomic,strong) QPGameController *game;
@property(nonatomic,copy) NSString *lastUI;
@property(nonatomic,copy) NSString *message;
@property(nonatomic,copy) NSString *exportDirectory;
@property(nonatomic,strong) NSDictionary *lastSafeArea;
@end
@implementation QPManagerController
- (instancetype)initWithState:(QPState *)state { if ((self=[super initWithStyle:UITableViewStyleInsetGrouped])) _state=state; return self; }
- (void)viewDidLoad {
    [super viewDidLoad]; self.title=@"QQ 宠物";
    self.navigationItem.rightBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"刷新" style:UIBarButtonItemStylePlain target:self action:@selector(poll)];
    self.navigationItem.leftBarButtonItem=[[UIBarButtonItem alloc] initWithTitle:@"返回管理" style:UIBarButtonItemStylePlain target:self action:@selector(returnToManager)];
    __weak QPManagerController *weakSelf=self;
    self.timer=[NSTimer scheduledTimerWithTimeInterval:0.5 repeats:YES block:^(NSTimer *timer){ [weakSelf poll]; }];
    [NSRunLoop.mainRunLoop addTimer:self.timer forMode:NSRunLoopCommonModes];
    [self poll];
}
- (void)returnToManager { [self command:@"managerHide" args:@{}]; }
- (void)dealloc { [self.timer invalidate]; }
- (void)alert:(NSString *)message {
    self.message=message; [self.tableView reloadData];
    if (self.presentedViewController) return;
    UIAlertController *alert=[UIAlertController alertControllerWithTitle:@"QQPet" message:message preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"好" style:UIAlertActionStyleDefault handler:nil]];
    [self presentViewController:alert animated:YES completion:nil];
}
- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section { return 8; }
- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)index {
    UITableViewCell *cell=[[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle reuseIdentifier:nil];
    NSArray *titles=@[@"开始桌宠",@"停止桌宠",@"宠物菜单",@"宠物状态",@"导入存档",@"导出存档",@"朗读剪贴板文本",@"运行信息"];
    cell.textLabel.text=titles[index.row]; cell.accessoryType=index.row==7?UITableViewCellAccessoryNone:UITableViewCellAccessoryDisclosureIndicator;
    BOOL running=QPProcessAlive(self.status);
    if (index.row==0) cell.detailTextLabel.text=running?@"桌宠已在运行":@"独立 HUD，退出管理界面后继续运行";
    if (index.row==6) cell.detailTextLabel.text=@"只在点击后读取，不后台监视剪贴板";
    if (index.row==7) {
        cell.detailTextLabel.numberOfLines=0;
        NSString *detail=self.status[@"message"] ?: self.status[@"fatalError"] ?: self.status[@"stopReason"] ?: @"尚未启动";
        cell.detailTextLabel.text=[NSString stringWithFormat:@"%@ · manager UID %u\n%@\n%@",running?@"运行中":@"已停止",getuid(),detail,self.message ?: @""];
    }
    return cell;
}
- (void)command:(NSString *)op args:(NSDictionary *)args {
    NSError *error=nil;
    if (!QPProcessAlive(self.status)) { [self alert:@"请先启动桌宠。"]; return; }
    if (![self.state enqueueCommand:@{@"op":op,@"args":args ?: @{}} instance:self.status[@"instance"] error:&error]) [self alert:error.localizedDescription];
}
- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)index {
    [tableView deselectRowAtIndexPath:index animated:YES]; NSError *error=nil;
    switch (index.row) {
        case 0: if (!QPStartHUD(self.state,&error)) [self alert:error.localizedDescription]; else { self.message=@"正在等待 HUD 启动握手…"; [self poll]; } break;
        case 1: if (!QPStopHUD(self.state,&error)) [self alert:error.localizedDescription]; break;
        case 2: [self command:@"trayClick" args:@{@"kind":@"menu"}]; break;
        case 3: [self command:@"trayClick" args:@{@"kind":@"state"}]; break;
        case 4: [self command:@"importSave" args:@{}]; break;
        case 5: [self command:@"exportSave" args:@{}]; break;
        case 6: { NSString *text=UIPasteboard.generalPasteboard.string; if (text.length) [self command:@"clipboard" args:@{@"text":text}]; else [self alert:@"剪贴板中没有文本。"]; break; }
        default: [self poll]; break;
    }
}
- (void)finishUI:(id)value error:(NSString *)error {
    if (!self.pendingUI) return;
    if (self.exportDirectory) { [NSFileManager.defaultManager removeItemAtPath:self.exportDirectory error:NULL]; self.exportDirectory=nil; }
    NSDictionary *response=@{@"instance":self.pendingUI[@"instance"],@"requestId":self.pendingUI[@"requestId"],@"value":value ?: NSNull.null,@"error":error ?: (id)NSNull.null};
    self.pendingResponse=response; [self writePendingResponse];
}
- (void)writePendingResponse {
    if (!self.pendingResponse) return;
    NSError *error=nil;
    if ([self.state writeJSON:self.pendingResponse name:@"ui-response.json" error:&error]) {
        self.pendingResponse=nil; self.pendingUI=nil; self.pendingController=nil;
    } else {
        self.message=[NSString stringWithFormat:@"无法回复桌宠：%@；正在重试。",error.localizedDescription];
        [self.tableView reloadData];
    }
}
- (void)poll {
    NSDictionary *status=[self.state readJSON:@"hud.json"];
    if (![status isEqual:self.status]) { self.status=status; [self.tableView reloadData]; }
    // Orientation/resize can reach the HUD before UIKit settles these measurements.
    // Publish again when they change, so the page does not retain the previous direction's insets.
    if (UIApplication.sharedApplication.applicationState==UIApplicationStateActive && self.view.window) {
        UIEdgeInsets inset=self.view.window.safeAreaInsets;
        NSDictionary *safe=@{@"left":@(inset.left),@"top":@(inset.top),@"right":@(inset.right),@"bottom":@(inset.bottom)};
        if (![safe isEqual:self.lastSafeArea] && [self.state writeJSON:safe name:@"safe-area.json" error:NULL]) {
            self.lastSafeArea=safe;
            if (QPProcessAlive(status)) [self.state enqueueCommand:@{@"op":@"safeArea"} instance:status[@"instance"] error:NULL];
        }
    }
    if (UIApplication.sharedApplication.applicationState==UIApplicationStateActive) {
        CGRect nav=[self.navigationController.navigationBar convertRect:self.navigationController.navigationBar.bounds toCoordinateSpace:UIScreen.mainScreen.fixedCoordinateSpace];
        if (nav.size.width>nav.size.height) { nav.size.height=CGRectGetMaxY(nav); nav.origin.y=0; }
        [self.state writeJSON:@{@"active":@YES,@"pid":@(getpid()),@"updatedAt":@(NSDate.date.timeIntervalSince1970),@"reserved":@{@"x":@(nav.origin.x),@"y":@(nav.origin.y),@"width":@(nav.size.width),@"height":@(nav.size.height)}} name:@"manager.json" error:NULL];
    }
    NSDictionary *request=[self.state readJSON:@"ui-request.json"];
    if (self.pendingUI) {
        if (![request[@"instance"] isEqual:self.pendingUI[@"instance"]] || ![request[@"requestId"] isEqual:self.pendingUI[@"requestId"]] || !QPProcessAlive(status)) {
            // The HUD canceled or stopped. A late picker/share completion must
            // never settle a later request accepted by this manager.
            self.pendingUI=nil; self.pendingResponse=nil; self.pendingController=nil;
            if (self.exportDirectory) { [NSFileManager.defaultManager removeItemAtPath:self.exportDirectory error:NULL]; self.exportDirectory=nil; }
            if (self.game) { self.game.closed=nil; [self.game.host invalidate]; self.game=nil; }
            [self dismissViewControllerAnimated:YES completion:nil];
        } else if (self.pendingResponse) [self writePendingResponse];
    }
    if (!request || self.pendingUI || !QPProcessAlive(status) || ![request[@"instance"] isEqual:status[@"instance"]] || [request[@"requestId"] isEqual:self.lastUI] || UIApplication.sharedApplication.applicationState!=UIApplicationStateActive) return;
    NSTimeInterval created=[request[@"createdAt"] doubleValue],now=NSDate.date.timeIntervalSince1970;
    if (created<=0 || created>now || now-created>=30) return;
    if ([request[@"op"] isEqual:@"openGame"] && self.game) {
        // Returning from the desktop to a different game must not leave the
        // previously presented game in front. Complete its normal close/reward
        // path, then the next poll accepts the still-current requested game.
        [self.game closeGame];
        return;
    }
    if (self.presentedViewController && ![request[@"op"] isEqual:@"closeGame"]) return;
    self.lastUI=request[@"requestId"]; self.pendingUI=request;
    NSError *ackError=nil;
    if (![self.state writeJSON:@{@"instance":request[@"instance"],@"requestId":request[@"requestId"]} name:@"ui-ack.json" error:&ackError]) { [self finishUI:nil error:ackError.localizedDescription ?: @"Could not acknowledge the manager request."]; return; }
    NSString *op=request[@"op"]; NSDictionary *args=request[@"args"];
    if ([op isEqual:@"editText"]) {
        NSString *text=args[@"text"], *placeholder=args[@"placeholder"];
        if (![text isKindOfClass:NSString.class] || text.length>200000) { [self finishUI:nil error:@"Invalid editor text."]; return; }
        UIAlertController *editor=[UIAlertController alertControllerWithTitle:@"输入文字" message:nil preferredStyle:UIAlertControllerStyleAlert];
        [editor addTextFieldWithConfigurationHandler:^(UITextField *field){
            field.text=text; field.placeholder=[placeholder isKindOfClass:NSString.class]?placeholder:nil; field.secureTextEntry=[args[@"secure"] boolValue];
            field.autocorrectionType=UITextAutocorrectionTypeNo;
            if ([args[@"type"] isEqual:@"url"]) field.keyboardType=UIKeyboardTypeURL;
            else if ([args[@"type"] isEqual:@"email"]) field.keyboardType=UIKeyboardTypeEmailAddress;
            else if ([args[@"type"] isEqual:@"number"]) field.keyboardType=UIKeyboardTypeDecimalPad;
        }];
        __weak QPManagerController *weakSelf=self; __weak UIAlertController *weakEditor=editor;
        [editor addAction:[UIAlertAction actionWithTitle:@"取消" style:UIAlertActionStyleCancel handler:^(UIAlertAction *action){ if ([weakSelf.pendingUI[@"requestId"] isEqual:request[@"requestId"]]) [weakSelf finishUI:nil error:nil]; }]];
        [editor addAction:[UIAlertAction actionWithTitle:@"完成" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action){ if ([weakSelf.pendingUI[@"requestId"] isEqual:request[@"requestId"]]) [weakSelf finishUI:weakEditor.textFields.firstObject.text ?: @"" error:nil]; }]];
        self.pendingController=editor; [self presentViewController:editor animated:YES completion:nil];
    } else if ([op isEqual:@"importSave"]) {
        UIDocumentPickerViewController *picker=[[UIDocumentPickerViewController alloc] initWithDocumentTypes:@[@"public.json",@"public.text"] inMode:UIDocumentPickerModeImport];
        picker.delegate=self; picker.allowsMultipleSelection=NO; self.pendingController=picker;
        [self presentViewController:picker animated:YES completion:nil];
    } else if ([op isEqual:@"exportSave"]) {
        NSString *name=args[@"name"]; if (![name isKindOfClass:NSString.class]) name=@"QQPet.json";
        name=name.lastPathComponent;
        NSString *text=args[@"text"]; NSError *error=nil;
        NSString *directory=[[NSTemporaryDirectory() stringByAppendingPathComponent:@"net.ankio.qqpet.exports"] stringByAppendingPathComponent:request[@"requestId"]];
        if (![NSFileManager.defaultManager createDirectoryAtPath:directory withIntermediateDirectories:YES attributes:nil error:&error]) { [self finishUI:nil error:error.localizedDescription]; return; }
        self.exportDirectory=directory;
        NSString *file=[directory stringByAppendingPathComponent:name];
        if (![text isKindOfClass:NSString.class] || ![text writeToFile:file atomically:YES encoding:NSUTF8StringEncoding error:&error]) { [self finishUI:nil error:error.localizedDescription ?: @"Invalid export content."]; return; }
        // Use a file export destination instead of the activity sheet's icon/preview
        // pipeline; both routes preserve the same JSON export contract on iOS 14.
        UIDocumentPickerViewController *picker=[[UIDocumentPickerViewController alloc] initWithURL:[NSURL fileURLWithPath:file] inMode:UIDocumentPickerModeExportToService];
        picker.delegate=self; self.pendingController=picker;
        [self presentViewController:picker animated:YES completion:nil];
    } else if ([op isEqual:@"openGame"]) {
        if (self.game) { [self finishUI:nil error:@"A game is already open."]; return; }
        NSString *swf=args[@"swf"];
        if (![swf isKindOfClass:NSString.class] || !swf.length || [swf containsString:@".."] || [swf hasPrefix:@"/"] || ![swf.pathExtension isEqual:@"swf"]) { [self finishUI:nil error:@"Invalid game asset."]; return; }
        if (![self.state matchesGeneration:args[@"generation"]]) { [self finishUI:nil error:@"存档已更换，请重新打开小游戏。"]; return; }
        QQAssetServer *server=[[QQAssetServer alloc] initWithWebRoot:[NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"web"] assetRoot:[NSBundle.mainBundle.bundlePath stringByAppendingPathComponent:@"web"] port:[[NSURL URLWithString:status[@"origin"]].port unsignedShortValue]];
        QPGameController *game=[QPGameController new]; game.host=[[QPHostController alloc] initWithState:self.state server:server role:@"game"]; self.game=game;
        game.title=swf.lastPathComponent.stringByDeletingPathExtension;
        __weak QPGameController *weakGame=game;
        game.host.managerOperation=^(NSDictionary *request,void (^reply)(id,NSString *)){ if ([request[@"op"] isEqual:@"closeGame"]) { reply(nil,nil); [weakGame closeGame]; } else reply(nil,@"This operation belongs to the pet HUD."); };
        NSURLComponents *components=[NSURLComponents componentsWithString:status[@"origin"]];
        components.path=@"/game.html"; components.queryItems=@[[NSURLQueryItem queryItemWithName:@"swf" value:swf]];
        // URLSearchParams uses form decoding, where a literal plus means a space.
        components.percentEncodedQuery=[components.percentEncodedQuery stringByReplacingOccurrencesOfString:@"+" withString:@"%2B"];
        NSURL *url=components.URL;
        [game.host loadURL:url];
        NSString *instance=status[@"instance"], *sessionID=NSUUID.UUID.UUIDString, *generation=args[@"generation"] ?: self.state.generation; NSTimeInterval started=NSDate.date.timeIntervalSince1970;
        __weak QPManagerController *weakSelf=self;
        game.closed=^{ QPManagerController *manager=weakSelf; manager.game=nil; [manager.state enqueueCommand:@{@"op":@"gamePlayed",@"args":@{@"sessionId":sessionID,@"generation":generation,@"minutes":@((NSDate.date.timeIntervalSince1970-started)/60)}} instance:instance error:NULL]; };
        UINavigationController *navigation=[[UINavigationController alloc] initWithRootViewController:game]; navigation.modalPresentationStyle=UIModalPresentationFullScreen;
        [self presentViewController:navigation animated:YES completion:^{ if ([self.pendingUI[@"requestId"] isEqual:request[@"requestId"]]) [self finishUI:@{@"sessionId":sessionID} error:nil]; }];
    } else if ([op isEqual:@"closeGame"]) { [self.game closeGame]; [self finishUI:nil error:nil]; }
    else [self finishUI:nil error:@"Unknown manager operation."];
}
- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls {
    if (controller!=self.pendingController || !self.pendingUI) return;
    if ([self.pendingUI[@"op"] isEqual:@"exportSave"]) { [self finishUI:@YES error:nil]; return; }
    NSURL *url=urls.firstObject; BOOL scoped=[url startAccessingSecurityScopedResource];
    NSError *error=nil; NSString *text=[NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];
    if (scoped) [url stopAccessingSecurityScopedResource];
    [self finishUI:text error:error.localizedDescription];
}
- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller { if (controller==self.pendingController && self.pendingUI) [self finishUI:[self.pendingUI[@"op"] isEqual:@"exportSave"]?@NO:nil error:nil]; }
@end
