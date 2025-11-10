import { View } from "react-native";
import { Home, User, Plus } from "lucide-react-native";

export default function Test() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Home color="black" size={48} />
      <Plus color="red" size={48} />
      <User color="blue" size={48} />
    </View>
  );
}
