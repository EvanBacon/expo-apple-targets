import ClassKit

class ContextProvider: CLSContextProvider {

    override func updateDescendants(of context: CLSContext, completion: @escaping (Error?) -> Void) {
        // Called when ClassKit needs to update the context hierarchy.
        // Add child contexts to the given context as appropriate.
        completion(nil)
    }
}
