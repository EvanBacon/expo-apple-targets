import ExpoModulesCore
import WidgetKit

public class ExpoWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoWidget")

    Function("set") { (key: String, value: String, group: String?) in
      let userDefaults = UserDefaults(suiteName: group)
      userDefaults?.set(value, forKey: key)
        
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
