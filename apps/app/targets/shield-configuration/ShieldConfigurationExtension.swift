//
//  ShieldConfigurationExtension.swift
//  ShieldConfiguration
//
//  Created by Robert Herber on 2024-10-25.
//

import Foundation
import ManagedSettings
import ManagedSettingsUI
import UIKit

func convertBase64StringToImage(imageBase64String: String?) -> UIImage? {
  if let imageBase64String = imageBase64String {
    let imageData = Data(base64Encoded: imageBase64String)
    let image = UIImage(data: imageData!)
    return image
  }

  return nil
}

func buildLabel(text: String?, with color: UIColor?)
  -> ShieldConfiguration.Label? {
  if let text = text {
    let color = color ?? UIColor.label
    return .init(text: text, color: color)
  }

  return nil
}

func resolveIcon(dict: [String: Any]) -> UIImage? {
  let iconAppGroupRelativePath = dict["iconAppGroupRelativePath"] as? String
  let iconSystemName = dict["iconSystemName"] as? String

  var image: UIImage?

  if let iconSystemName = iconSystemName {
    image = UIImage(systemName: iconSystemName)
  }

  if let iconAppGroupRelativePath = iconAppGroupRelativePath {
    image = loadImageFromAppGroupDirectory(relativeFilePath: iconAppGroupRelativePath)
  }

  if let iconTint = getColor(color: dict["iconTint"] as? [String: Double]) {
    image?.withTintColor(iconTint)
  }

  return image
}

func getShieldConfiguration(config: [String: Any])
  -> ShieldConfiguration {
  let backgroundColor = getColor(color: config["backgroundColor"] as? [String: Double])

  let title = config["title"] as? String
  let titleColor = getColor(color: config["titleColor"] as? [String: Double])

  let subtitle = config["subtitle"] as? String
  let subtitleColor = getColor(color: config["subtitleColor"] as? [String: Double])

  let primaryButtonLabel = config["primaryButtonLabel"] as? String
  let primaryButtonLabelColor = getColor(
    color: config["primaryButtonLabelColor"] as? [String: Double])
  let primaryButtonBackgroundColor = getColor(
    color: config["primaryButtonBackgroundColor"] as? [String: Double])

  let secondaryButtonLabel = config["secondaryButtonLabel"] as? String
  let secondaryButtonLabelColor = getColor(
    color: config["secondaryButtonLabelColor"] as? [String: Double]
  )

  let shield = ShieldConfiguration(
    backgroundBlurStyle: config["backgroundBlurStyle"] != nil
      ? UIBlurEffect.Style.init(rawValue: config["backgroundBlurStyle"] as! Int) : nil,
    backgroundColor: backgroundColor,
    icon: resolveIcon(dict: config),
    title: buildLabel(text: title, with: titleColor),
    subtitle: buildLabel(text: subtitle, with: subtitleColor),
    primaryButtonLabel: buildLabel(
      text: primaryButtonLabel, with: primaryButtonLabelColor),
    primaryButtonBackgroundColor: primaryButtonBackgroundColor,
    secondaryButtonLabel: buildLabel(
      text: secondaryButtonLabel, with: secondaryButtonLabelColors)
  )

  return shield
}

// Override the functions below to customize the shields used in various situations.
// The system provides a default appearance for any methods that your subclass doesn't override.
// Make sure that your class name matches the NSExtensionPrincipalClass in your Info.plist.
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    if let config = userDefaults?.dictionary(forKey: "shieldConfiguration") {
      return getShieldConfiguration(config: config)
    }

    return ShieldConfiguration()
  }

  override func configuration(shielding application: Application, in category: ActivityCategory)
    -> ShieldConfiguration {
    if let dict = userDefaults?.dictionary(forKey: "shieldConfiguration") {
      return getShieldConfiguration(config: dict)
    }

    return ShieldConfiguration()
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    if let config = userDefaults?.dictionary(forKey: "shieldConfiguration") {
      return getShieldConfiguration(config: config)
    }

    return ShieldConfiguration()
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory)
    -> ShieldConfiguration {
    if let config = userDefaults?.dictionary(forKey: "shieldConfiguration") {
      return getShieldConfiguration(config: config)
    }

    return ShieldConfiguration()
  }
}
