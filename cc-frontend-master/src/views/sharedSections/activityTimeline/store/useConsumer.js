import { useContext } from "react";
import { ActivityContext } from "./Context";

export default function useActivity() {
  const { ...store } = useContext(ActivityContext);
  return { ...store };
}
