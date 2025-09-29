import ExpoModulesCore
import WidgetKit

public class ExtensionStorageModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExtensionStorage")
        
        Function("remove") { (forKey: String, suiteName: String?) in
            UserDefaults(suiteName: suiteName)?.removeObject(forKey: forKey)
        }
        
        Function("reloadWidget") { (timeline: String?) in
            if let timeline = timeline {
                WidgetCenter.shared.reloadTimelines(ofKind: timeline)
            } else {
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
        
        Function("reloadControls") { (kind: String?) in
            if #available(iOS 18.0, *) {
                if let kind = kind {
                    ControlCenter.shared.reloadControls(ofKind: kind)
                } else {
                    ControlCenter.shared.reloadAllControls()
                }
            }
        }
        
        Function("setArray") { (forKey: String, data: [[String: Any]], suiteName: String?) -> Bool in
            // Convert the incoming array of dictionaries directly to JSON data
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
                UserDefaults(suiteName: suiteName)?.set(jsonData, forKey: forKey)
                return true
            } catch {
                // If encoding fails for some reason, return false
                return false
            }
        }
        
        Function("setObject") { (forKey: String, data: [String: Any], suiteName: String?) -> Bool in
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: data, options: [])
                UserDefaults(suiteName: suiteName)?.set(jsonData, forKey: forKey)
                return true
            } catch {
                // If encoding fails for some reason, return false
                return false
            }
        }
        
        Function("setInt") { (key: String, value: Int, group: String?) in
            let userDefaults = UserDefaults(suiteName: group)
            userDefaults?.set(value, forKey: key)
        }
        
        Function("setString") { (key: String, value: String, group: String?) in
            let userDefaults = UserDefaults(suiteName: group)
            userDefaults?.set(value, forKey: key)
        }        

        Function("get") { (key: String, group: String?) -> String? in
            let userDefaults = UserDefaults(suiteName: group)
            if let data = userDefaults?.data(forKey: key) {
                do {
                    let jsonObject = try JSONSerialization.jsonObject(with: data, options: [])
                    let jsonData = try JSONSerialization.data(withJSONObject: jsonObject, options: [.prettyPrinted])
                    return String(data: jsonData, encoding: .utf8)
                } catch {                    
                    return nil
                }
            }
            
            if let value = userDefaults?.object(forKey: key) {
                return String(describing: value)
            }
            return nil
        }
    }
}
