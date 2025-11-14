import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WelcomeImage from "../../assets/images/welcome.png";
import Button from "../../components/Button";
import ScreenWrapper from "../../components/ScreenWrapper";
import { theme } from "../../constants/theme";
import { hp, wp } from "../../helpers/common";

const Welcome = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <View style={[
        styles.footer,
        Platform.OS === 'android' && {
          paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 32,
        }
      ]}>
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
