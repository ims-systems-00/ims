import React from "react";
function If({ expression = null, fallback = null, children }) {
  return expression ? <React.Fragment>{children}</React.Fragment> : fallback;
}
export default If;
