import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import ScreenWrapper from "../../components/ScreenWrapper";
import { StatusBar } from "expo-status-bar";
import { wp, hp } from "../../helpers/common";
import WelcomeImage from "../../assets/images/welcome.png";
import { Image } from "expo-image";
import { theme } from "../../constants/theme";
import Button from "../../components/Button";
import { useRouter } from "expo-router";

const Welcome = () => {
  const router = useRouter();
  return (
    <ScreenWrapper bg={"#fff"}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Welcome Image */}

        <Image
          style={styles.welcomeImage}
          source={WelcomeImage}
          resizeMode="contain"
        />

        {/* Title */}
        <View style={{ gap: 20 }}>
          <Text style={styles.title}>Framez!</Text>
          <Text style={styles.punchLine}>
            Where every thoughts finds a home and every image tells a story.
          </Text>
        </View>
      </View>

      {/* footer */}
      <View style={styles.footer}>
        <Button
          title="Getting Started"
          buttonStyle={{ marginHorizontal: wp(3) }}
          onPress={() => router.push("/signup")}
        />
        <View style={styles.buttonTextContainer}>
          <Text style={styles.loginText}>Already have an account!</Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text
              style={[
                StyleSheet.loginText,
                {
                  color: theme.colors.primaryDark,
                  fontWeight: theme.fonts.semibold,
                },
              ]}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingHorizontal: wp(4),
  },
  welcomeImage: {
    height: wp(80),
    width: wp(100),
    alignSelf: "center",
  },
  title: {
    color: theme.colors.text,
    fontSize: hp(4),
    textAlign: "center",
    fontWeight: theme.fonts.extrabold,
  },
  punchLine: {
    textAlign: "center",
    paddingHorizontal: wp(10),
    fontSize: hp(1.7),
    color: theme.colors.text,
  },
  footer: {
    gap: 30,
    width: "100%",
    // Add extra bottom padding on Android to clear navigation bar
    paddingBottom: Platform.OS === "android" ? 32 : 0,
  },
  buttonTextContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  loginText: {
    textAlign: "center",
    color: theme.colors.text,
    fontSize: hp(1.6),
  },
});
