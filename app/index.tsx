import { useRouter } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";

export default function Index() {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <TouchableOpacity
        onPress={() => {
          router.push("/details");
        }}
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: "blue",
          borderRadius: 5,
        }}
      >
        <Text style={{ color: "white" }}>Press me</Text>
      </TouchableOpacity>
    </View>
  );
}
