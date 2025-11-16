import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../stores/themeStore';

const ScreenWrapper = ({ children, bg }) => {
  const { top } = useSafeAreaInsets();
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const background = bg ?? colors.background;

  const styles = useMemo(() => ({
    flex: 1,
    backgroundColor: background,
    paddingTop: top > 0 ? top + 5 : 30,
  }), [background, top]);

  return (
    <View style={styles}>
      {children}
    </View>
  );
};

export default React.memo(ScreenWrapper);
