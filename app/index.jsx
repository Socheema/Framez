import { useRouter } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";


export default function Index() {
  const router = useRouter();
  return (
    <ScreenWrapper>
    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <Text>Index</Text>
      <TouchableOpacity onPress={() => router.push('/Welcome')} style={{marginTop:20,padding:10,backgroundColor:'blue'}}>
        <Text style={{color:'white'}}>Go to Welcome</Text>
      </TouchableOpacity>
      </View>
      </ScreenWrapper>
  );
}
