# 🔐 Environment Variables Setup Guide

## 📋 Overview

This project uses environment variables to securely store Supabase API credentials. This guide will help you set up your local development environment.

## 🚀 Quick Setup (3 Steps)

### Step 1: Copy the Example File
```bash
cp .env.example .env
```

### Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy these two values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon/public key** (the long JWT token under "Project API keys")

### Step 3: Add Credentials to .env

Open `.env` and paste your credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 4: Restart Development Server

**Important:** Expo needs to be restarted after adding/changing `.env`:

```bash
# Stop the current server (Ctrl+C), then run:
npx expo start --clear
```

The `--clear` flag clears the cache and ensures environment variables are loaded.

## ✅ Verification

After setup, your app should start without errors. If you see this error:

```
❌ Missing Supabase environment variables!
```

It means:
- `.env` file is missing or not in the project root
- Environment variables are not prefixed with `EXPO_PUBLIC_`
- Development server wasn't restarted after adding `.env`

## 📁 File Structure

```
framez-social/
├── .env                 # ← Your actual credentials (DO NOT COMMIT)
├── .env.example         # ← Template with instructions
├── .gitignore           # ← Ensures .env is not committed
└── utils/
    └── supabase.js      # ← Reads from environment variables
```

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Keep `.env` file local (never commit to git)
- ✅ Use `.env.example` to document required variables
- ✅ Prefix Expo variables with `EXPO_PUBLIC_`
- ✅ Use Row Level Security (RLS) in Supabase for data protection
- ✅ Rotate keys if accidentally exposed

### ❌ DON'T:
- ❌ Commit `.env` to git
- ❌ Share credentials in Slack/Discord/Email
- ❌ Use production credentials in development
- ❌ Hardcode credentials in source files

## 🧪 Testing Your Setup

After setting up, test that Supabase connection works:

1. Start your app: `npx expo start --clear`
2. Try to sign in or sign up
3. Check console for any Supabase errors
4. If you see "Missing Supabase environment variables" error, review steps above

## 🌐 Environment Variables in Expo

### How Expo Handles Environment Variables

Expo uses a different approach than standard Node.js apps:

1. **Prefix Required**: All variables MUST start with `EXPO_PUBLIC_`
2. **Build Time**: Variables are embedded at build time (not runtime)
3. **Restart Required**: Must restart dev server after changes
4. **Client-Side Safe**: `EXPO_PUBLIC_` variables are safe in client code

### Example:

```javascript
// ✅ Correct - prefixed with EXPO_PUBLIC_
const url = process.env.EXPO_PUBLIC_SUPABASE_URL

// ❌ Wrong - will be undefined
const url = process.env.SUPABASE_URL
```

## 🔧 Troubleshooting

### Problem: "Missing Supabase environment variables!"

**Solutions:**
1. Ensure `.env` file exists in project root (not in subdirectory)
2. Check variable names start with `EXPO_PUBLIC_`
3. Restart dev server: `npx expo start --clear`
4. Verify `.env` file has no syntax errors (no quotes needed)

### Problem: "Cannot connect to Supabase"

**Solutions:**
1. Verify Supabase URL is correct (check for typos)
2. Verify anon key is complete (no line breaks or spaces)
3. Check Supabase project is not paused (free tier auto-pauses)
4. Check internet connection

### Problem: Changes to .env not working

**Solution:**
Always restart with clear flag:
```bash
npx expo start --clear
```

## 🚢 Deployment

### For Production:

Different platforms handle environment variables differently:

#### EAS Build (Expo's build service):
```bash
# Set secrets using EAS CLI
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
```

#### Expo Web:
Add environment variables to your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Cloudflare Pages: Settings → Environment Variables

## 📝 Adding New Environment Variables

When adding new environment variables:

1. **Add to .env:**
   ```env
   EXPO_PUBLIC_NEW_VARIABLE=value
   ```

2. **Add to .env.example:**
   ```env
   EXPO_PUBLIC_NEW_VARIABLE=your-value-here
   ```

3. **Update this documentation**

4. **Restart dev server:**
   ```bash
   npx expo start --clear
   ```

5. **Update deployment secrets** (EAS/Vercel/etc.)

## 🆘 Getting Help

If you're still having issues:

1. Check `.env.example` for the correct format
2. Verify `.env` is in project root (run `ls -la .env`)
3. Check `.gitignore` includes `.env` (run `cat .gitignore | grep .env`)
4. Ensure no trailing spaces in `.env` values
5. Try creating `.env` from scratch

## 📚 Related Files

- `.env` - Your actual credentials (git ignored)
- `.env.example` - Template with setup instructions
- `utils/supabase.js` - Supabase client configuration
- `.gitignore` - Ensures `.env` is not committed

## ✨ Summary

```bash
# Quick setup commands:
cp .env.example .env
# Edit .env with your credentials
npx expo start --clear
```

That's it! Your Supabase credentials are now secure. 🎉
