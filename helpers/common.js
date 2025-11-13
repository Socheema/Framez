import { Dimensions } from "react-native";

// Cache dimensions for better performance
const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');

// Memoized helper functions for responsive sizing
export const hp = (percentage) => {
  return (percentage * deviceHeight) / 100;
};

export const wp = (percentage) => {
  return (percentage * deviceWidth) / 100;
};

// Get current dimensions (useful for responsive updates)
export const getDimensions = () => ({
  width: deviceWidth,
  height: deviceHeight,
});
