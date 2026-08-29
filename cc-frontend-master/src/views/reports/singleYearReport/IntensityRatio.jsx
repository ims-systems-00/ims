import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { useSingleYearReport } from "./store";
function IntensityRatio() {
  const { report } = useSingleYearReport();
  return (
    <Table>
      <tbody>
        
      </tbody>
    </Table>
  );
}

export default IntensityRatio;
