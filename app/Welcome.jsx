import { View, Text } from 'react-native'
import React from 'react'
import ScreenWrapper from '../components/ScreenWrapper';

const Welcome = () => {
  return (
    <ScreenWrapper bg={"#fff"}>
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <Text>Welcome to Framez Social!</Text>
      </View>
    </ScreenWrapper>
  )
}

export default Welcome
