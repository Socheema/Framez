/**
 * Metro configuration with inlineRequires enabled to speed up startup by
 * lazily requiring modules. This is a non-destructive optimization and
 * compatible with Expo-managed apps.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable inlineRequires to improve startup time by deferring require() calls
// until they're actually used.
config.transformer = config.transformer || {};
config.transformer.inlineRequires = true;

module.exports = config;
