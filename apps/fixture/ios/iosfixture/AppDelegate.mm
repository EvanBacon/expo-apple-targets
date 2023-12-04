#import "AppDelegate.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // Override point for customization after application launch.

    // Create a window
    self.window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
    self.window.backgroundColor = [UIColor whiteColor];

    // Create a view controller
    UIViewController *viewController = [[UIViewController alloc] init];
    viewController.view.backgroundColor = [UIColor whiteColor];

    // Create a label
    UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(0, 0, 200, 50)];
    label.text = @"Hello, World!";
    label.textAlignment = NSTextAlignmentCenter;
    label.center = viewController.view.center;
    [viewController.view addSubview:label];

    // Set the root view controller
    self.window.rootViewController = viewController;

    // Show the window
    [self.window makeKeyAndVisible];


    return YES;
}

@end
