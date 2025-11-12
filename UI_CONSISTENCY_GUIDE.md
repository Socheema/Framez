# UI Consistency Guide - Theme Implementation

## Design System Reference

### Theme Constants (`constants/theme.js`)
```javascript
colors: {
  primary: "#00c26f",        // Main green color
  primaryDark: "#00ac62",    // Darker green for emphasis
  dark: "#3e3e3e",
  darkLight: "#e1e1e1",
  gray: "#e3e3e3",
  text: "#494949",           // Main text color
  textLight: "#7c7c7c",      // Secondary text
  textDark: "#1d1d1d",       // Headings
  rose: "#ef4444",           // Errors
  roseLight: "#f87171",
}

fonts: {
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
}

radius: {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 20,
  xx: 22,
}
```

### Helper Functions
- `hp(percentage)` - Height percentage of screen
- `wp(percentage)` - Width percentage of screen

## Component Usage Patterns

### 1. Page Wrapper
```jsx
import ScreenWrapper from '../../components/ScreenWrapper';
<ScreenWrapper bg="#fff">
  {/* Content */}
</ScreenWrapper>
```

### 2. Button Component
```jsx
import Button from '../../components/Button';
<Button
  title="Button Text"
  onPress={handlePress}
  loading={isLoading}
  buttonStyle={{ marginTop: hp(2) }}
/>
```

### 3. Text Inputs
```jsx
<TextInput
  style={styles.input}
  placeholder="Email"
  placeholderTextColor={theme.colors.textLight}
  // ...props
/>

// Style
input: {
  width: '100%',
  backgroundColor: '#fff',
  color: theme.colors.text,
  paddingHorizontal: wp(4),
  paddingVertical: hp(1.8),
  borderRadius: theme.radius.xl,
  borderWidth: 1,
  borderColor: theme.colors.gray,
  fontSize: hp(2),
}
```

### 4. Headings
```jsx
<Text style={styles.logo}>Framez</Text>

// Style
logo: {
  fontSize: hp(4),
  color: theme.colors.text,
  fontWeight: theme.fonts.extrabold,
  textAlign: 'center',
}
```

### 5. Subtitles
```jsx
<Text style={styles.subtitle}>Description text</Text>

// Style
subtitle: {
  fontSize: hp(1.8),
  color: theme.colors.text,
  textAlign: 'center',
}
```

### 6. Links
```jsx
<TouchableOpacity onPress={handlePress}>
  <Text style={styles.link}>Link Text</Text>
</TouchableOpacity>

// Style
link: {
  color: theme.colors.primaryDark,
  fontWeight: theme.fonts.semibold,
  fontSize: hp(1.6),
}
```

### 7. Error Messages
```jsx
<View style={styles.errorContainer}>
  <Text style={styles.errorText}>{error}</Text>
</View>

// Styles
errorContainer: {
  backgroundColor: `${theme.colors.rose}20`,
  paddingHorizontal: wp(4),
  paddingVertical: hp(1.5),
  borderRadius: theme.radius.md,
  borderLeftWidth: 3,
  borderLeftColor: theme.colors.rose,
},
errorText: {
  color: theme.colors.rose,
  textAlign: 'center',
  fontSize: hp(1.6),
}
```

### 8. Success Messages
```jsx
<View style={styles.successContainer}>
  <Text style={styles.successText}>{message}</Text>
</View>

// Styles
successContainer: {
  backgroundColor: `${theme.colors.primary}20`,
  paddingHorizontal: wp(4),
  paddingVertical: hp(1.5),
  borderRadius: theme.radius.md,
  borderLeftWidth: 3,
  borderLeftColor: theme.colors.primary,
},
successText: {
  color: theme.colors.primary,
  textAlign: 'center',
  fontSize: hp(1.6),
}
```

## Files Requiring Updates

### ✅ COMPLETED
- [x] `app/login/index.jsx` - Updated with theme

### 🔄 IN PROGRESS
- [ ] `app/signup/index.jsx`
- [ ] `app/forgotPassword/index.jsx`
- [ ] `app/updatePassword/index.jsx`
- [ ] `app/resetPassword/index.jsx`

### ⏳ PENDING - Tab Pages
- [ ] `app/tabs/feed.jsx`
- [ ] `app/tabs/create.jsx`
- [ ] `app/tabs/profile.jsx`

### ⏳ PENDING - Components
- [ ] `components/CommentsModal.jsx`

## Migration Checklist

For each file, follow these steps:

### 1. Import Updates
```jsx
// Add these imports
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import Button from '../../components/Button';
import ScreenWrapper from '../../components/ScreenWrapper';
```

### 2. Color Replacements
Replace hardcoded colors with theme colors:
- `#000` → `theme.colors.text` or `theme.colors.dark`
- `#fff` → `#fff` (white stays)
- `#999` → `theme.colors.textLight`
- `#0095f6` → `theme.colors.primary`
- `#00ac62` → `theme.colors.primaryDark`
- `#ff4444` → `theme.colors.rose`
- `#e3e3e3` → `theme.colors.gray`

### 3. Font Weight Replacements
- `fontWeight: 'bold'` → `fontWeight: theme.fonts.bold`
- `fontWeight: '600'` → `fontWeight: theme.fonts.semibold`
- `fontWeight: '800'` → `fontWeight: theme.fonts.extrabold`

### 4. Border Radius Replacements
- `borderRadius: 8` → `borderRadius: theme.radius.md`
- `borderRadius: 20` → `borderRadius: theme.radius.xl`
- `borderRadius: 12` → `borderRadius: theme.radius.sm`

### 5. Sizing Replacements
Replace fixed pixel values with responsive helpers:
- `fontSize: 48` → `fontSize: hp(4)`
- `fontSize: 16` → `fontSize: hp(2)`
- `fontSize: 14` → `fontSize: hp(1.8)`
- `padding: 24` → `paddingHorizontal: wp(5)`
- `marginTop: 16` → `marginTop: hp(2)`

### 6. Button Replacements
Replace custom button implementations with Button component:
```jsx
// BEFORE
<TouchableOpacity style={styles.button} onPress={handlePress}>
  {loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.buttonText}>Submit</Text>
  )}
</TouchableOpacity>

// AFTER
<Button
  title="Submit"
  onPress={handlePress}
  loading={loading}
/>
```

### 7. Layout Wrapper
Wrap content with ScreenWrapper:
```jsx
// BEFORE
<View style={{ flex: 1, backgroundColor: '#000' }}>
  {/* content */}
</View>

// AFTER
<ScreenWrapper bg="#fff">
  {/* content */}
</ScreenWrapper>
```

## Testing Checklist

After each file update:
- [ ] No TypeScript/lint errors
- [ ] Colors match Welcome page
- [ ] Fonts are consistent
- [ ] Spacing is harmonious
- [ ] Buttons use Button component
- [ ] Inputs have proper styling
- [ ] Error messages styled correctly
- [ ] Layout is not broken
- [ ] Responsive on different screen sizes
- [ ] Dark mode compatibility (if applicable)

## Common Mistakes to Avoid

1. **Don't mix units**: Use either hp/wp OR fixed pixels, not both
2. **Don't skip ScreenWrapper**: All full-screen pages should use it
3. **Don't hardcode colors**: Always use theme.colors
4. **Don't use arbitrary font weights**: Use theme.fonts
5. **Don't ignore spacing**: Use gap property or consistent margins
6. **Don't skip Button component**: Use it for all primary actions
7. **Keep accessibility**: Maintain good contrast ratios
8. **Test on mobile**: Ensure touch targets are adequate

## Priority Order

Update files in this order for maximum impact:

1. **High Priority** (User-facing auth flows):
   - signup/index.jsx
   - forgotPassword/index.jsx
   - updatePassword/index.jsx

2. **Medium Priority** (Main features):
   - tabs/feed.jsx
   - tabs/create.jsx
   - tabs/profile.jsx

3. **Low Priority** (Components):
   - CommentsModal.jsx

## Notes

- The Welcome page is the design reference - match its visual quality
- Maintain existing functionality - this is UI-only
- Use semantic color names (primary, text, etc.) not color values
- Keep responsive behavior with hp/wp helpers
- Ensure consistency across all platforms (iOS, Android, Web)
