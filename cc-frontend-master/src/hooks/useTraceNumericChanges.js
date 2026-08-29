function useTraceNumericChanges() {
  function traceNumericChanges(oldData = 0, newData = 0) {
    if (!oldData) oldData = 0;
    if (!newData) newData = 0;
    const difference = newData - oldData;
    if (difference === 0)
      return {
        number: 0,
        string: "",
      };

    let calc = difference;
    if (difference > 0 && !oldData)
      return {
        number: 100,
        string: "+" + 100,
      };
    calc = (difference / oldData) * 100;
    calc = parseInt(calc);
    return {
      number: calc,
      string: calc >= 0 ? "+" + calc : calc + "",
    };
  }

  function traceChangeColorClass(changes = 0) {
    return changes > 0 ? "badge-fade-danger" : "badge-fade-success";
  }
  return { traceNumericChanges, traceChangeColorClass };
}
export default useTraceNumericChanges;
