import React from "react";
import useStore from "./useStore";
export const Context = React.createContext();
const ContextProvider = ({ module = null, moduleType = null, children }) => {
  let { ...store } = useStore({ module, moduleType });
  return (
    <Context.Provider
      value={{
        ...store,
      }}
    >
      {children}
    </Context.Provider>
  );
};
export default ContextProvider;
