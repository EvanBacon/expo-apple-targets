import NetworkExtension

class DNSProxyProvider: NEDNSProxyProvider {

    override func startProxy(options:[String: Any]? = nil, completionHandler: @escaping (Error?) -> Void) {
        // Add code here to start the DNS proxy.
        completionHandler(nil)
    }

    override func stopProxy(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        // Add code here to stop the DNS proxy.
        completionHandler()
    }

    override func sleep(completionHandler: @escaping () -> Void) {
        // Add code here to get ready to sleep.
        completionHandler()
    }

    override func wake() {
        // Add code here to wake up.
    }

    override func handleNewFlow(_ flow: NEAppProxyFlow) -> Bool {
        // Add code here to handle the incoming flow.
        return false
    }

}
