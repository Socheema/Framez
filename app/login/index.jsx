import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";
import { useAuthStore } from "../../stores/auth";

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setSession, setRememberMe, rememberMe } = useAuthStore();

  async function signInWithEmail() {
    if (!isValidEmail(email))
      return Alert.alert("Invalid Email", "Please enter a valid email address.");
    if (password.length < 6)
      return Alert.alert("Invalid Password", "Password must be at least 6 characters.");

    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          Alert.alert("Error", "Incorrect email or password.");
        } else if (error.message.includes("email_not_confirmed")) {
          Alert.alert("Email Not Verified", "Please verify your email before logging in.");
        } else if (error.message.includes("network")) {
          Alert.alert("Network Error", "Check your internet connection and try again.");
        } else {
          Alert.alert("Login Failed", error.message);
        }
      } else {
        setSession(session);
        await setRememberMe(rememberMe);
        router.replace("/tabs");
      }
    } catch (err) {
      Alert.alert("Unexpected Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.rememberContainer}>
        <Text>Remember me</Text>
        <Switch value={rememberMe} onValueChange={setRememberMe} />
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Sign In" onPress={signInWithEmail} color="#3897f0" />
      )}

      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbdbdb",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fafafa",
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  link: {
    textAlign: "center",
    color: "#3897f0",
    marginTop: 20,
  },
});
