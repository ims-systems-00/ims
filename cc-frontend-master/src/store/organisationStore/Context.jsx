import React from "react";
import useStore from "./useStore";
import { Link } from "react-router-dom";
export const Context = React.createContext();
const ContextProvider = ({ children }) => {
  let store = useStore({});
  if (!store?.authBetaVersion())
    return (
      <p className="text-center m-5">
        Your organisation does not have a license.{" "}
        <Link to={"/logout"}>Logout</Link>
      </p>
    );
  return <Context.Provider value={store}>{children}</Context.Provider>;
};
export default ContextProvider;
