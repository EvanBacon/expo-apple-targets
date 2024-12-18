// import React from "react";
// import { Image, StyleSheet, Text, View } from "react-native";

// export default function App() {
//   return (
//     <View style={styles.container}>
//       <View
//         style={{
//           padding: 16,
//           justifyContent: "center",
//           alignItems: "center",
//           backgroundColor: "#F6F6F6",
//           gap: 8,
//         }}
//       >
//         <View
//           style={{
//             borderRadius: 50,
//             width: 100,
//             height: 3,
//             backgroundColor: "#737373",
//           }}
//         />

//         <View
//           style={{
//             flexDirection: "row",
//             gap: 8,
//             alignItems: "center",
//           }}
//         >
//           <Image
//             source={{
//               uri: "https://github.com/evanbacon.png",
//             }}
//             style={{
//               width: 30,
//               height: 30,
//               borderRadius: 18,
//             }}
//           />

//           <Text>
//             Sharing as <Text style={{ fontWeight: "bold" }}>baconbrix</Text>
//           </Text>
//         </View>
//       </View>

//       <Text>Open up App.js to start working on your app!!</Text>
//     </View>
//   );
// }

import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  useWindowDimensions,
} from "react-native";

const App = (props) => {
  console.log("Props", props);
  const { height } = useWindowDimensions();
  return (
    <View
      style={{
        backgroundColor: "transparent",
        flex: 1,
        justifyContent: "flex-end",
      }}
    >
      {/* <View style={{ flex: 1 }} /> */}
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 20,
          overflow: "hidden",
          gap: 12,

          paddingBottom: 96,

          // minHeight: height / 2,
        }}
      >
        {/* Header */}
        <View
          style={{
            padding: 16,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#F6F6F6",
            gap: 8,
          }}
        >
          <View
            style={{
              borderRadius: 50,
              width: 100,
              height: 3,
              backgroundColor: "#737373",
            }}
          />

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Image
              source={{
                uri: "https://github.com/evanbacon.png",
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 18,
              }}
            />

            <Text>
              Sharing as <Text style={{ fontWeight: "bold" }}>baconbrix</Text>
            </Text>
          </View>
        </View>

        {/* Cards */}
        <View
          style={{
            flexDirection: "row",
            // flexWrap: "wrap",
            gap: 24,
            padding: 12,
          }}
        >
          <Card type="Reel" image={{ uri: "https://github.com/expo.png" }} />
          <Card type="Post" image={{ uri: "https://github.com/expo.png" }} />
          <Card type="Story" image={{ uri: "https://github.com/expo.png" }} />
          <Card type="Message" image={{ uri: "https://github.com/expo.png" }} />
        </View>
      </View>
    </View>
  );
};

const Card = ({ type, image }) => {
  return (
    <View style={{ gap: 12, flex: 1 }}>
      <View
        style={{
          elevation: 3,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }}
      >
        <Image
          source={image}
          resizeMode="cover"
          style={{
            borderRadius: 10,
            height: 150,
            minHeight: 150,
          }}
        />
      </View>
      <CardButton url="https://github/">{type}</CardButton>
    </View>
  );
};

function CardButton({ url, children }) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        Linking.openURL(url);
      }}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "stretch",
    backgroundColor: "#fff",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  headerText: {
    fontSize: 18,
  },
  boldText: {
    fontWeight: "bold",
  },
  cardContainer: {},
  card: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    margin: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 5,
  },
  cardSubTitle: {
    fontSize: 10,
    color: "gray",
  },
  cardDate: {
    fontSize: 10,
    color: "gray",
    marginVertical: 5,
  },
  appBadge: {
    backgroundColor: "#000",
    padding: 5,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
  },
  button: {
    backgroundColor: "#007aff",
    borderRadius: 20,
    paddingVertical: 5,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default App;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#fff",
//     alignItems: "stretch",
//   },
// });
