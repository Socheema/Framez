import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ScreenWrapper = ({ children, bg }) => {
  const { top } = useSafeAreaInsets();
  
  const styles = useMemo(() => ({
    flex: 1,
    backgroundColor: bg,
    paddingTop: top > 0 ? top + 5 : 30,
  }), [bg, top]);
  
  return (
    <View style={styles}>
      {children}
    </View>
  );
};

export default React.memo(ScreenWrapper);
