// Load environment variables from .env file
require("dotenv").config();

module.exports = ({ config }) => {
  return {
    ...config,
    name: "Framez Social",
    slug: "framez-social",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "framezsocial",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.framezsocial.app",
    },
    android: {
      package: "com.framezsocial.app",
      // Use Hermes on Android to improve JS startup performance in production builds.
      // For managed Expo projects Hermes is enabled via the `jsEngine` field.
      jsEngine: "hermes",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#E41E3F",
      },
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA",
        "READ_MEDIA_IMAGES",
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    web: {
      output: "static",
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission:
            "The app needs access to your photos to let you share images.",
        },
      ],
      "expo-font",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "9d0378d7-fd7e-471e-9c07-d95670d24c87",
      },
      supabaseAnonKey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaWd4emVzeWNkY2NoeXpubmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjE5MTksImV4cCI6MjA3ODMzNzkxOX0.z0Uux9yaRgRX5racdcagN_Se818nfc9ZLBkIbPUk6Vw",
      supabaseUrl: "https://qligxzesycdcchyznncw.supabase.co",
    },
  };
};
