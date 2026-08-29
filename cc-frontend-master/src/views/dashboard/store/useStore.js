import useYearlyReport from "../../sharedHooks/useYearlyReport";
export default function useStore() {
  return {
    ...useYearlyReport(),
  };
}
