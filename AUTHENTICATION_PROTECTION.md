# Authentication & Route Protection System

## Overview
This document describes the comprehensive authentication protection system implemented across the Framez Social app. The system uses defense-in-depth strategy with multiple layers of authentication checks to ensure only authenticated users can access protected routes.

## Architecture

### Authentication Store (`stores/auth.js`)
- **State Management**: Zustand store managing `session`, `user`, `profile`, `isLoaded`, `isPasswordRecovery`
- **Methods**: `loadAuth()`, `signIn()`, `signUp()`, `logout()`, `updateProfile()`
- **Integration**: Supabase Auth with AsyncStorage persistence
- **Session Tracking**: Real-time session state with automatic updates

### Protection Layers

#### Layer 1: Root Layout Guard (`app/_layout.jsx`)
**Purpose**: Primary authentication checkpoint for all routes

**Logic**:
```javascript
// Waits for auth to load before making routing decisions
if (!isLoaded) return;

// Redirects based on session state and current route
if (session && !inAuthGroup) {
  router.replace('/tabs'); // Authenticated → tabs
} else if (!session && inAuthGroup) {
  router.replace('/login'); // Unauthenticated → login
}
```

**Features**:
- ✅ Waits for `isLoaded` flag before redirecting
- ✅ Shows loading screen with ActivityIndicator
- ✅ Handles password recovery flow
- ✅ Prevents redirect loops
- ✅ Explicit redirect to `/login` (not just `/`)

**Protected Routes**:
- `/tabs/*` - Requires authentication

**Public Routes**:
- `/` - Welcome page
- `/login` - Login page
- `/signup` - Signup page
- `/forgotPassword` - Password reset request
- `/updatePassword` - Password update (recovery flow)
- `/resetPassword` - Alternative reset flow

#### Layer 2: Tabs Layout Guard (`app/tabs/_layout.jsx`)
**Purpose**: Defense-in-depth protection for tab navigation

**Logic**:
```javascript
useEffect(() => {
  if (isLoaded && !session) {
    router.replace('/login');
  }
}, [session, isLoaded]);

// Don't render tabs without valid session
if (!isLoaded) return <LoadingScreen />;
if (!session) return null;
```

**Features**:
- ✅ Redundant auth check (defense-in-depth)
- ✅ Loading state while checking auth
- ✅ Prevents rendering tabs without session
- ✅ Redirects to login if session lost
- ✅ No content flash before redirect

**Protected Tabs**:
- `/tabs/feed` - Main feed
- `/tabs/create` - Create post
- `/tabs/profile` - User profile

#### Layer 3: Individual Page Guards
**Purpose**: Handle session loss during page use

**Pages Protected**:
1. **Feed Page** (`app/tabs/feed.jsx`)
2. **Create Page** (`app/tabs/create.jsx`)
3. **Profile Page** (`app/tabs/profile.jsx`)

**Logic** (each page):
```javascript
useEffect(() => {
  if (!session) {
    console.log('⚠️ Session lost - redirecting to login');
    router.replace('/login');
  }
}, [session]);
```

**Features**:
- ✅ Detects session loss during use
- ✅ Immediate redirect on session expiry
- ✅ Graceful handling of auth state changes
- ✅ Console logging for debugging

#### Layer 4: Public Page Guards
**Purpose**: Prevent authenticated users from accessing auth pages

**Pages**:
1. **Login Page** (`app/login/index.jsx`)
2. **Signup Page** (`app/signup/index.jsx`)

**Logic**:
```javascript
useEffect(() => {
  if (session) {
    console.log('✅ Already authenticated - redirecting to tabs');
    router.replace('/tabs');
  }
}, [session]);
```

**Features**:
- ✅ Auto-redirect if already logged in
- ✅ Prevents redundant login/signup
- ✅ Smooth UX for authenticated users

## Security Features

### Defense-in-Depth Strategy
Multiple layers of protection ensure security even if one layer is bypassed:

1. **Root Layout** - Primary gate
2. **Tabs Layout** - Secondary gate
3. **Individual Pages** - Tertiary gate
4. **Public Pages** - Reverse protection

### Session State Monitoring
- Real-time session tracking via Zustand
- Automatic re-renders on session changes
- Immediate response to auth state changes

### Loading States
- Shows ActivityIndicator while checking auth
- Prevents content flash before redirect
- White background for clean appearance
- Uses theme.colors.primary (green) for consistency

### Redirect Logic
- Explicit redirects to `/login` or `/tabs`
- No redirect loops or infinite cycles
- Handles edge cases (password recovery, etc.)
- Console logging for debugging

## User Experience

### Authentication Flow
```
1. User opens app
   ↓
2. Root layout loads auth state
   ↓
3. Shows loading screen
   ↓
4. If not authenticated → Redirect to /login
   If authenticated → Redirect to /tabs
   ↓
5. Tabs layout double-checks session
   ↓
6. Individual pages monitor session
```

### Logout Flow
```
1. User clicks logout
   ↓
2. Auth store clears session
   ↓
3. All guards detect null session
   ↓
4. Redirect to /login
   ↓
5. Cannot access /tabs without re-login
```

### Session Expiry Flow
```
1. Session expires while using app
   ↓
2. Zustand detects session = null
   ↓
3. Page guard triggers
   ↓
4. Immediate redirect to /login
   ↓
5. User sees login page
```

## Testing Scenarios

### ✅ Implemented Protections
- [x] Direct URL access to `/tabs` without auth → Redirects to `/login`
- [x] Logout from any tab → Redirects to `/login`
- [x] Session expiry during use → Redirects to `/login`
- [x] Already authenticated accessing `/login` → Redirects to `/tabs`
- [x] Already authenticated accessing `/signup` → Redirects to `/tabs`
- [x] No content flash before redirect (loading screen)
- [x] Multiple tab/page protection layers
- [x] Password recovery flow preserved
- [x] Root layout handles all public routes

### Edge Cases Covered
- Password recovery sessions (special handling)
- Update password flow (no interference)
- Multiple navigation attempts
- Race conditions in auth loading
- Browser back button after logout
- Deep linking to protected routes

## Code Locations

### Authentication Files
- `stores/auth.js` - Authentication state management
- `utils/supabase.js` - Supabase client configuration

### Layout Files
- `app/_layout.jsx` - Root layout with primary auth guard
- `app/tabs/_layout.jsx` - Tabs layout with secondary guard

### Protected Pages
- `app/tabs/feed.jsx` - Feed page with session monitor
- `app/tabs/create.jsx` - Create page with session monitor
- `app/tabs/profile.jsx` - Profile page with session monitor

### Public Pages
- `app/login/index.jsx` - Login page with reverse guard
- `app/signup/index.jsx` - Signup page with reverse guard
- `app/forgotPassword/index.jsx` - Password reset request
- `app/updatePassword/index.jsx` - Password update
- `app/resetPassword/index.jsx` - Alternative reset
- `app/index.jsx` - Welcome/landing page

## Console Logging

All authentication redirects include console logs for debugging:

```javascript
// Root layout
'✅ User authenticated - redirecting to tabs'
'⚠️ User not authenticated - redirecting to login'

// Tabs layout
'⚠️ Unauthorized access to tabs - redirecting to login'

// Individual pages
'⚠️ Session lost in feed - redirecting to login'
'⚠️ Session lost in create - redirecting to login'
'⚠️ Session lost in profile - redirecting to login'

// Public pages
'✅ Already authenticated - redirecting to tabs'
```

## Best Practices

### For Developers
1. Always use `session` from `useAuthStore` for auth checks
2. Wait for `isLoaded` before making routing decisions
3. Use `router.replace()` not `router.push()` for redirects
4. Add console logs for debugging redirect logic
5. Show loading states during auth checks
6. Don't render protected content without session

### For New Protected Routes
To add a new protected route:

```javascript
// 1. Add to root layout public routes check
const inNewRoute = segments[0] === 'newRoute';

// 2. Create route file with session guard
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/auth';

export default function NewRoute() {
  const { session } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session]);

  if (!session) return null;

  return /* your content */;
}
```

### For New Public Routes
To add a new public route:

```javascript
// 1. Add to root layout auth redirect check
const inNewRoute = segments[0] === 'newRoute';
if (session && !inAuthGroup && !inNewRoute) {
  router.replace('/tabs');
}

// 2. Optionally add reverse guard if needed
useEffect(() => {
  if (session) {
    router.replace('/tabs');
  }
}, [session]);
```

## Maintenance

### When to Update
- Adding new protected routes
- Adding new public routes
- Changing authentication provider
- Modifying auth state structure
- Adding new auth-related features

### Files to Check
- `app/_layout.jsx` - Update route checks
- `stores/auth.js` - Update auth logic
- New route files - Add appropriate guards
- This documentation - Keep updated

## Summary

The authentication protection system uses a **defense-in-depth** approach with **4 layers** of protection:

1. **Root Layout** - Primary checkpoint (all routes)
2. **Tabs Layout** - Secondary checkpoint (tabs only)
3. **Page Guards** - Tertiary checkpoint (individual pages)
4. **Public Guards** - Reverse protection (public pages)

This ensures:
- ✅ No unauthorized access to protected routes
- ✅ Graceful handling of session loss
- ✅ Smooth user experience with loading states
- ✅ Robust security with multiple checkpoints
- ✅ Easy debugging with console logs
- ✅ Maintainable and scalable architecture

**Status**: ✅ Fully implemented and tested
**Last Updated**: 2024
**Version**: 1.0
