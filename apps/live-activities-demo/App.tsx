import React from "react";
import { StyleSheet, Text, View } from "react-native";

import LiveActivities from "@/modules/expo-live-activity";

export default function App() {
  return (
    <View style={styles.container}>
      <Text
        onPress={() => {
          LiveActivities.startActivity("Hello", "🚀");
        }}
      >
        Start Activity
      </Text>
      <Text
        onPress={() => {
          const emojis = ["🚀", "🥓", "🔥", "⚡️"];
          LiveActivities.updateActivity(
            emojis[Math.floor(Math.random() * emojis.length)]
          );
        }}
      >
        Update Activity
      </Text>
      <Text
        onPress={() => {
          LiveActivities.endActivity();
        }}
      >
        End Activity
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
