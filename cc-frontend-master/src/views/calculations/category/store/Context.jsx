import React from "react";
import useStore from "./useStore";
export const Context = React.createContext();
const ContextProvider = ({ category = null, children }) => {
  let { ...store } = useStore({ category });
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
