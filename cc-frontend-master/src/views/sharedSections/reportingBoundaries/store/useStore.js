import useReportingBoundaries from "../../../sharedHooks/useReportingBoundaries";
export default function useStore({ parameterId = null }) {
  return { ...useReportingBoundaries({ parameterId }) };
}
