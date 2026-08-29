import { useContext } from "react";
import { Context } from "./Context";
export default function useConsumer() {
  return useContext(Context);
}
