# 🚀 Quick Rebuild Guide - APK Crash Fixed

## ✅ ALL FIXES COMMITTED
**Status:** Ready to rebuild
**Commit:** 9f539e9

---

## 🔨 REBUILD COMMANDS

### Option 1: Clean Rebuild (Recommended)
```bash
# Clean previous builds
rm -rf android/ ios/ .expo/

# Prebuild native code
npx expo prebuild --clean --platform android

# Build production APK
eas build -p android --profile production --clear-cache
```

### Option 2: Quick Rebuild
```bash
# Just rebuild (if you already prebuilt)
eas build -p android --profile production --clear-cache
```

---

## ⏱️ Build Timeline

1. **Upload:** 1-2 minutes
2. **Build:** 10-15 minutes
3. **Download:** 1-2 minutes
4. **Install & Test:** 2-3 minutes

**Total:** ~15-20 minutes

---

## 🎯 WHAT WAS FIXED

### 🔴 Critical Fix: Environment Variables
**Before:** Missing in production → App crashed on launch
**After:** Embedded in app.json → App will launch successfully

### 🟡 Important Fixes:
- ✅ Android permissions added
- ✅ expo-image-picker configured
- ✅ Error boundary enhanced
- ✅ Production logging added

---

## 📱 AFTER BUILD COMPLETES

### Install APK:
```bash
adb install path/to/framez-social.apk
```

### Watch Logs:
```bash
adb logcat | grep -E "supabase|error|crash|==="
```

### Expected Success Logs:
```
✅ Found supabaseUrl in Constants.expoConfig.extra
✅ Found supabaseAnonKey in Constants.expoConfig.extra
✅ Supabase client created successfully
✅ AUTH STORE: Auth loaded successfully
```

---

## ✅ SUCCESS CHECKLIST

- [ ] Build completes without errors
- [ ] APK installs on device
- [ ] **App launches without crash** ← KEY!
- [ ] Splash screen shows
- [ ] Navigates to welcome/login
- [ ] All features work

---

## 🐛 IF STILL CRASHES

### Check Logs:
```bash
adb logcat | grep "❌"
```

### Look For:
- Missing environment variables
- Permission errors
- Native module errors

### Solution:
- Verify `--clear-cache` was used
- Check app.json has credentials
- Rebuild if needed

---

## 📞 QUICK REFERENCE

**Build Command:**
```bash
eas build -p android --profile production --clear-cache
```

**Build Status:**
https://expo.dev/accounts/socheema/projects/framez-social/builds

**Package Name:**
com.framezsocial.app

**Documentation:**
- `CRASH_FIX_DIAGNOSTIC.md` - Full analysis
- `FIX_IMPLEMENTATION_SUMMARY.md` - Complete summary
- This file - Quick rebuild guide

---

**🎉 You're all set! Run the build command and the app should work!**
