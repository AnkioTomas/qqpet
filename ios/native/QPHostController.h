#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import "QPState.h"
#import "QQAssetServer.h"
NS_ASSUME_NONNULL_BEGIN
@interface QPHostController : UIViewController
@property(nonatomic, readonly) WKWebView *webView;
@property(nonatomic, readonly) NSString *role;
@property(nonatomic, copy, nullable) NSDictionary *managerLayout;
@property(nonatomic, copy) void (^stopRequested)(NSString *reason);
@property(nonatomic, copy) void (^managerOperation)(NSDictionary *request, void (^reply)(id _Nullable value, NSString * _Nullable error));
@property(nonatomic, copy) void (^cancelManagerOperation)(NSNumber * _Nullable request, NSString *page);
@property(nonatomic, copy) void (^statusChanged)(NSDictionary *status);
- (instancetype)initWithState:(QPState *)state server:(QQAssetServer *)server role:(NSString *)role;
- (void)loadURL:(NSURL *)url;
- (void)emit:(NSString *)event value:(id _Nullable)value;
- (void)setPaused:(BOOL)paused;
- (void)updateProcessPolicy;
- (void)updateOrientation:(UIInterfaceOrientation)orientation;
- (void)requestFlushThen:(void (^)(void))completion;
- (void)invalidate;
@end
NS_ASSUME_NONNULL_END
