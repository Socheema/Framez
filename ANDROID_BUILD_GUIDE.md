# 🔧 Android Build Instructions - Framez Social

## ✅ Build Preparation Completed

### 1. Configuration Verified
- ✅ **Package Name Fixed**: Changed from `framezsocial.app` to `com.framezsocial.app` for consistency
- ✅ **app.json**: Properly configured with Android settings
- ✅ **app.config.js**: Environment variables embedded for production
- ✅ **eas.json**: EAS Build configuration in place
- ✅ **Environment Variables**: `.env` file exists with Supabase credentials

### 2. Build Artifacts Cleaned
- ✅ Removed `android/` directory
- ✅ Removed `ios/` directory
- ✅ Removed `.expo/` cache
- ✅ Committed all configuration changes

### 3. Native Code Generated
- ✅ Ran `npx expo prebuild --clean --platform android`
- ✅ Fresh Android native project created
- ✅ All dependencies configured

---

## 🚀 Building the Android App

Since you don't have Java/Android SDK installed locally, **EAS Build** is the recommended method. It builds your app in the cloud with all necessary tools pre-configured.

### Option 1: EAS Build (Recommended) ⭐

#### A. Build APK for Testing (Preview Profile)
```bash
eas build --platform android --profile preview
```

**What this does:**
- ✅ Builds an APK file for internal distribution
- ✅ Can be installed directly on Android devices
- ✅ Can be uploaded to Appetize.io
- ✅ Doesn't require Google Play signing
- ✅ Build time: ~10-15 minutes

**After build completes:**
- Download the APK from the provided URL
- Install on Android devices via ADB or file transfer
- Upload to Appetize.io for testing

#### B. Build AAB for Google Play (Production Profile)
```bash
eas build --platform android --profile production
```

**What this does:**
- ✅ Creates Android App Bundle (.aab)
- ✅ Optimized for Google Play Store
- ✅ Auto-increments version code
- ✅ Requires Google Play signing configuration

---

### Option 2: Local Build (Advanced - Requires Setup)

**Prerequisites:**
1. Install Java Development Kit (JDK 17+)
2. Install Android Studio or Android SDK Command Line Tools
3. Set environment variables:
   ```bash
   export JAVA_HOME=/path/to/jdk
   export ANDROID_HOME=/path/to/android-sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

**Build Command:**
```bash
cd android
./gradlew assembleRelease
cd ..
```

**Output Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📋 Build Configuration Details

### Android Package Information
```json
{
  "package": "com.framezsocial.app",
  "versionCode": 1,
  "version": "1.0.0"
}
```

### EAS Project ID
```
9d0378d7-fd7e-471e-9c07-d95670d24c87
```

### Build Profiles (eas.json)

**Development:**
- Development client enabled
- Internal distribution
- For testing with Expo Go

**Preview:**
- Internal distribution
- Generates APK
- For direct installation & Appetize

**Production:**
- Auto-increment version code
- Generates AAB
- For Google Play Store

---

## 🎯 Next Steps to Complete the Build

### Step 1: Run EAS Build
```bash
# For testing/Appetize (APK)
eas build --platform android --profile preview

# For Google Play (AAB)
eas build --platform android --profile production
```

### Step 2: Monitor Build Progress
- EAS will show build progress in the terminal
- You can also track it at: https://expo.dev/accounts/[your-account]/projects/framez-social/builds
- Build typically takes 10-15 minutes

### Step 3: Download Build
When the build completes, EAS provides:
- ✅ Direct download URL for APK/AAB
- ✅ QR code for easy device installation
- ✅ Build ID for reference

### Step 4: Test the Build
**For APK (Preview Profile):**
```bash
# Install on connected Android device
adb install path/to/app.apk

# Or upload to Appetize.io
# Visit: https://appetize.io/upload
```

**For AAB (Production Profile):**
- Upload to Google Play Console
- Test via internal testing track
- Release to production when ready

---

## 🔍 Verifying the Build

### Before Building - Checklist
- [x] Package name is `com.framezsocial.app`
- [x] Version code is set correctly
- [x] Environment variables are in app.config.js
- [x] `.env` file exists with credentials
- [x] All code is committed to git
- [x] Native code is prebuilt (`android/` directory exists)

### After Building - Test Checklist
- [ ] App installs successfully
- [ ] App launches without crashing
- [ ] Environment variables load correctly
- [ ] Supabase connection works
- [ ] Login/signup flows work
- [ ] All features function properly
- [ ] No production errors in logs

---

## 🐛 Troubleshooting

### Build Fails - Missing Dependencies
```bash
npm install
npx expo install --fix
```

### Build Fails - Environment Variables
- Ensure `.env` file exists in project root
- Verify `EXPO_PUBLIC_SUPABASE_URL` is set
- Verify `EXPO_PUBLIC_SUPABASE_ANON_KEY` is set
- Check app.config.js loads environment variables

### Build Fails - EAS Authentication
```bash
eas login
```

### Local Build Fails - Missing Java
**Error:** `JAVA_HOME is not set`
**Solution:** Install JDK and set JAVA_HOME, or use EAS Build instead

### APK Installation Fails
- Enable "Install from Unknown Sources" on Android device
- Check APK is not corrupted (re-download if needed)
- Ensure device has enough storage

---

## 📊 Build Output Comparison

| Method | Output | Size | Use Case | Setup Required |
|--------|--------|------|----------|----------------|
| **EAS Preview** | APK | ~30-50 MB | Testing, Appetize | None ⭐ |
| **EAS Production** | AAB | ~20-30 MB | Google Play | None ⭐ |
| **Local Gradle** | APK | ~30-50 MB | Custom builds | Java, Android SDK |

---

## 🔐 Production Checklist

Before releasing to production:

### Security
- [ ] Environment variables secured
- [ ] API keys not exposed in code
- [ ] ProGuard/R8 enabled for code obfuscation
- [ ] SSL pinning implemented (if needed)

### Performance
- [ ] App tested on low-end devices
- [ ] Images optimized
- [ ] Bundle size optimized
- [ ] Crash reporting configured

### Google Play Requirements
- [ ] Privacy policy URL added
- [ ] App signing configured
- [ ] Target SDK version meets requirements (API 34+)
- [ ] All required permissions declared
- [ ] App content rating completed

---

## 📱 Installing on Devices

### Via ADB (USB Connected)
```bash
adb devices
adb install path/to/app.apk
```

### Via Appetize.io
1. Go to https://appetize.io/upload
2. Upload your APK file
3. Get shareable link for testing
4. Test in browser without physical device

### Via Email/Drive
1. Send APK to device
2. Enable "Install from Unknown Sources"
3. Open APK file
4. Follow installation prompts

---

## 🎉 Success Criteria

Your build is successful when:

✅ **Build completes without errors**
- EAS Build shows "Build finished"
- APK/AAB file is generated
- No compilation errors

✅ **App installs on device**
- Installation completes successfully
- App icon appears in launcher
- No installation errors

✅ **App launches correctly**
- Splash screen displays
- App doesn't crash on launch
- Reaches login/home screen

✅ **Features work in production**
- Authentication flows work
- API calls succeed
- Images load
- Navigation works
- Realtime updates function

---

## 📚 Additional Resources

- **EAS Build Documentation**: https://docs.expo.dev/build/introduction/
- **Android Build Process**: https://docs.expo.dev/build-reference/android-builds/
- **Troubleshooting Guide**: https://docs.expo.dev/build-reference/troubleshooting/
- **Appetize.io**: https://appetize.io/

---

## 💡 Recommendations

### For Development & Testing
→ **Use EAS Build with Preview Profile**
- Fastest setup
- No local dependencies
- Consistent builds
- Easy sharing

### For Production Release
→ **Use EAS Build with Production Profile**
- Optimized AAB format
- Auto-versioning
- Google Play ready
- Professional workflow

### For Custom Requirements
→ **Setup Local Build Environment**
- Install Android Studio
- Configure signing keys
- Build with Gradle
- More control over process

---

**Current Status:** ✅ Ready to build with EAS

**Next Command to Run:**
```bash
eas build --platform android --profile preview
```

This will create an APK file you can:
- Install directly on Android devices
- Upload to Appetize.io
- Share for testing
- Deploy for production use

---

**Date:** November 13, 2025
**App:** Framez Social v1.0.0
**Package:** com.framezsocial.app
**EAS Project ID:** 9d0378d7-fd7e-471e-9c07-d95670d24c87
