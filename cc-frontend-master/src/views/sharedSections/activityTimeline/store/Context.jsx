import React from "react";
import useStore from "./useStore";
export const ActivityContext = React.createContext();

const ActivityContextProvider = ({
  children,
  module = null,
  moduleType = null,
  readOnly = false,
}) => {
  let { ...store } = useStore({
    moduleType: moduleType,
    module: module,
  });
  return (
    <ActivityContext.Provider value={{ ...store, readOnly }}>
      {children}
    </ActivityContext.Provider>
  );
};

export default ActivityContextProvider;
