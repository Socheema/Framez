module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-gesture-handler)/)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};
