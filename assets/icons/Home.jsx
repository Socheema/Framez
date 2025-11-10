import * as React from "react";
import Svg, { Path } from "react-native-svg";

const Home = ({ color = "#000", width = 24, height = 24, strokeWidth = 2 }) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={width}
    height={height}
    color={color}
    fill="none"
  >
    <Path
      d="M15 17c-.8.62-1.85 1-3 1s-2.2-.38-3-1"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <Path
      d="M2.35 13.21c-.35-2.3-.53-3.45-.09-4.46.43-1.02 1.4-1.7 3.33-3.06L7.02 4.6C9.42 2.87 10.62 2 12 2s2.58.87 4.98 2.6l1.44 1.04c1.93 1.36 2.9 2.04 3.33 3.06.43 1.01.26 2.16-.09 4.46l-.3 1.96c-.5 3.26-.75 4.89-1.91 5.86C18.26 22 16.55 22 13.14 22h-2.28c-3.41 0-5.12 0-6.28-.99-1.16-.97-1.41-2.6-1.91-5.86l-.32-1.94Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

export default Home;




// import * as React from "react"
// import Svg, { Path } from "react-native-svg";

// const Home = (props) => (
//   <Svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={24} height={24} color="#000000" fill="none" {...props}>
//     <Path d="M15.0001 17C14.2006 17.6224 13.1504 18 12.0001 18C10.8499 18 9.79965 17.6224 9.00012 17" stroke="currentColor" strokeWidth={props.strokeWidth} strokeLinecap="round" />
//     <Path d="M2.35151 13.2135C1.99849 10.9162 1.82198 9.76763 2.25629 8.74938C2.69059 7.73112 3.65415 7.03443 5.58126 5.64106L7.02111 4.6C9.41841 2.86667 10.6171 2 12.0001 2C13.3832 2 14.5818 2.86667 16.9791 4.6L18.419 5.64106C20.3461 7.03443 21.3097 7.73112 21.744 8.74938C22.1783 9.76763 22.0018 10.9162 21.6487 13.2135L21.3477 15.1724C20.8473 18.4289 20.597 20.0572 19.4291 21.0286C18.2612 22 16.5538 22 13.1389 22H10.8613C7.44646 22 5.73903 22 4.57112 21.0286C3.40321 20.0572 3.15299 18.4289 2.65255 15.1724L2.35151 13.2135Z" stroke="currentColor" strokeWidth={props.strokeWidth} strokeLinejoin="round" />
//   </Svg>
// );

// export default Home;
