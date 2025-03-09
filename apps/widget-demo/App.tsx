import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { ExtensionStorage } from "@bacons/apple-targets";

const storage = new ExtensionStorage("group.bacon.data");

export default function App() {
  const [index, setIndex] = React.useState(0);
  const [toggleState, setToggleState] = React.useState(false);

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
      <View style={{ marginTop: 20, alignItems: "center" }}>
        <Text>Toggle State: {toggleState ? "ON" : "OFF"}</Text>
        <Switch
          value={toggleState}
          onValueChange={(value) => {
            setToggleState(value);
            storage.set("toggleState", value ? 1 : 0);
            ExtensionStorage.reloadControls();
          }}
          trackColor={{ false: "#CCCCCC", true: "#007AFF" }}
          thumbColor="#FFFFFF"
          style={{ marginTop: 20 }}
        />
      </View>
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
