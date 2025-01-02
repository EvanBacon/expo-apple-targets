import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ExtensionStorage } from "@bacons/apple-targets";

const storage = new ExtensionStorage("group.bacon.data");

export default function App() {
  const [index, setIndex] = React.useState(0);
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <Text
        onPress={() => {
          setIndex(index + 1);
          storage.set("index", String(index + 1));
          ExtensionStorage.reloadWidget();
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
