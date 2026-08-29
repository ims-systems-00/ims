import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useBaseYearCompareReport } from "./store";
function IntensityRatio() {
  const { report } = useBaseYearCompareReport();
  return (
    <Table>
      <tbody>
        
      </tbody>
    </Table>
  );
}

export default IntensityRatio;
