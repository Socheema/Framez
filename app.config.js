// Load environment variables from .env file
require('dotenv').config();

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
      bundleIdentifier: "com.framezsocial.app"
    },
    android: {
      package: "com.framezsocial.app",
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: "#E41E3F"
      },
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA",
        "READ_MEDIA_IMAGES"
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static"
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "The app needs access to your photos to let you share images."
        }
      ]
    ],
    experiments: {
      "typedRoutes": true,
      "reactCompiler": true
    },
    extra: {
      router: {},
      eas: {
        "projectId": "9d0378d7-fd7e-471e-9c07-d95670d24c87"
      },
      // Dynamic env vars (injected via .env or EAS secrets)
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  };
};
