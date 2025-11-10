import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { theme } from '../constants/theme'
import { hp } from '../helpers/common'

const shadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}

const Button = ({ buttonStyle, textStyle, title = '', onPress = () => {}, loadinga = false, hasShadow = false }) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, buttonStyle, hasShadow && shadowStyle]}>
      <Text style={[styles.text, textStyle]}>{title || 'Button'}</Text>
    </TouchableOpacity>
  )
}

export default Button

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    height: hp(6.6),
    justifyContent: "center",
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: theme.radius.xl
  },
  text:{
    color: 'white',
    height: hp(2.5),
    fontWeight: theme.fonts.bold,
  }
})
