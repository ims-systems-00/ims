import useYearlyReport from "../../../sharedHooks/useYearlyReport";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as ccReductionInitiativeService from "../../../../services/ccReductionInitiatives";
import useAPIResponse from "../../../../hooks/apiResponse";
import { useParameters } from "../../../../store/parametersStore";
import moment from "moment";
import { useBuildQueryString } from "@ims-systems-00/ims-react-hooks";
export default function useStore() {

  const [initiativesIdentified, setInitiativesIdentified] = useState([]); 
  const [initiativesImplemented, setInitiativesImplemented] = useState([]);
  const { handleError, handleSuccess } = useAPIResponse();
  const { reportingPeriods } = useParameters();
  const { selectedReportingYear, ...yearlyReport } = useYearlyReport();

  const { startDateISO, endDateISO } = useMemo(() => {
    const rp = reportingPeriods?.find((r) => r.year === selectedReportingYear?.year);
    if (!rp?.startDate || !rp?.endDate) return { startDateISO: null, endDateISO: null };
    return {
      startDateISO: moment(rp.startDate, "DD/MM/YYYY").toISOString(),
      endDateISO: moment(rp.endDate, "DD/MM/YYYY").toISOString(),
    };
  }, [reportingPeriods, selectedReportingYear]);

  const queryHandler = useBuildQueryString({
    required: {
      value: startDateISO && endDateISO ? {
        identifiedAt: { gte: startDateISO, lte: endDateISO },
      } : {},
    },
  });
  const queryHandlerImplemented = useBuildQueryString({
    required: {
      value: startDateISO && endDateISO ? {
        implementedAt: { gte: startDateISO, lte: endDateISO },
      } : {},
    },
  });
  const listInitiatives = useCallback(async function (query = "") {
    try {
      const response = await ccReductionInitiativeService.listInitiatives({
        query,
      });
      setInitiativesIdentified(response?.data?.ccCarbonReductionInitiatives);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }, [handleError, handleSuccess]);
  const listImplementedInitiatives = useCallback(async function (query = "") {
    try {
      const response = await ccReductionInitiativeService.listInitiatives({
        query,
      });
      setInitiativesImplemented(response?.data?.ccCarbonReductionInitiatives);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }, [handleError, handleSuccess]);

  useEffect(() => {
    if (startDateISO && endDateISO) {
      queryHandler.handleRequired({
        value: { identifiedAt: { gte: startDateISO, lte: endDateISO } },
      });
      queryHandlerImplemented.handleRequired({
        value: { implementedAt: { gte: startDateISO, lte: endDateISO } },
      });
    }
  }, [startDateISO, endDateISO]);


  const lastQueryRef = useRef(null);
  const lastImplementedQueryRef = useRef(null);
  useEffect(() => {
    if (!startDateISO || !endDateISO) return;
    const q = queryHandler.getQueryString();
    if (q && q !== lastQueryRef.current) {
      lastQueryRef.current = q;
      listInitiatives(q);
    }
  }, [queryHandler.query]);
  useEffect(() => {
    if (!startDateISO || !endDateISO) return;
    const q = queryHandlerImplemented.getQueryString();
    if (q && q !== lastImplementedQueryRef.current) {
      lastImplementedQueryRef.current = q;
      listImplementedInitiatives(q);
    }
  }, [queryHandlerImplemented.query]);

  return {

    selectedReportingYear,
    ...yearlyReport,
    initiativesIdentified,
    initiativesImplemented,
    listInitiatives,
    listImplementedInitiatives,
    queryHandler,
    queryHandlerImplemented,
  };
}
