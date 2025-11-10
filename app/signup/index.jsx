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
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";

// Helper validators
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    if (!name.trim()) return Alert.alert("Error", "Full name is required.");
    if (!isValidEmail(email))
      return Alert.alert("Error", "Please enter a valid email address.");
    if (password.length < 6)
      return Alert.alert("Error", "Password must be at least 6 characters.");

    setLoading(true);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: "https://your-app-url.com/login", // optional
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          Alert.alert("Error", "An account with this email already exists.");
        } else if (error.message.includes("network")) {
          Alert.alert("Network Error", "Please check your internet connection.");
        } else {
          Alert.alert("Signup Failed", error.message);
        }
      } else {
        if (!session)
          Alert.alert(
            "Verify Email",
            "Please check your inbox to verify your email before logging in."
          );
        router.replace("/login");
      }
    } catch (err) {
      Alert.alert("Unexpected Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />
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
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Sign Up" onPress={signUpWithEmail} color="#3897f0" />
      )}
      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
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
  link: {
    textAlign: "center",
    color: "#3897f0",
    marginTop: 20,
  },
});
