import React from "react";
import useStore from "./useStore";
export const Context = React.createContext();
const ContextProvider = ({ parameterId = null, children }) => {
  let { ...store } = useStore({ parameterId });
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
