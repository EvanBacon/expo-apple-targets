//
//  fx_app_intent.swift
//  fx-app-intent
//
//  Created by Evan Bacon on 12/3/23.
//

import AppIntents

struct fx_app_intent: AppIntent {
    static var title: LocalizedStringResource = "fx-app-intent"
    
    func perform() async throws -> some IntentResult {
        return .result()
    }
}
