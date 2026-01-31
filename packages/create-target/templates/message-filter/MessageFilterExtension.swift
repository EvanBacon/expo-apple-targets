import IdentityLookup

final class MessageFilterExtension: ILMessageFilterExtension {}

extension MessageFilterExtension: ILMessageFilterQueryHandling {

    func handle(_ queryRequest: ILMessageFilterQueryRequest, context: ILMessageFilterExtensionContext, completion: @escaping (ILMessageFilterQueryResponse) -> Void) {
        // First, check whether to filter using offline data (if possible).
        let offlineAction = self.offlineAction(for: queryRequest)

        switch offlineAction {
        case .allow, .junk, .promotion, .transaction:
            // Based on offline data, we know this message should either be allowed or filtered, so report
            let response = ILMessageFilterQueryResponse()
            response.action = offlineAction
            completion(response)

        case .none:
            // Based on offline data, we don't know whether this message should be allowed or filtered.
            // Defer to network.
            let response = ILMessageFilterQueryResponse()
            response.action = .none
            completion(response)

        @unknown default:
            break
        }
    }

    private func offlineAction(for queryRequest: ILMessageFilterQueryRequest) -> ILMessageFilterAction {
        // Replace with logic to perform offline check whether to filter first (if possible).
        return .none
    }

}
