import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Widget from "local:expo-widget";

export default function App() {
  const [index, setIndex] = React.useState(0);
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <Text
        onPress={() => {
          setIndex(index + 1);
          Widget.set("index", String(index + 1), "group.bacon.data");
        }}
      >
        Index: {index}
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
