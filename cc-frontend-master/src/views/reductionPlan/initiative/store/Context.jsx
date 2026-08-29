import React from "react";
import useStore from "./useStore";
import { INITIATIVE_STATUS } from "./constants";
export const Context = React.createContext();
const ContextProvider = ({ status = INITIATIVE_STATUS.COMPLETE, children }) => {
  let { ...store } = useStore({ status });
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
