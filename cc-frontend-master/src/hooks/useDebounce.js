import { useState, useEffect } from "react";
function useDebounce(delay) {
  const [value, setvalue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  function setDebounced(value) {
    setvalue(value);
  }
  return { debouncedValue, setDebounced };
}
export default useDebounce;
