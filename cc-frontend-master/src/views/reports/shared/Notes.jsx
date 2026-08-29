import React from "react";
import ReportContents from "./ReportContents";
import { Badge } from "@ims-systems-00/ims-ui-kit";
function Notes({}) {
  return (
    <React.Fragment>
      <ReportContents>
        <h5 className="border-bottom">Notes</h5>
        <p>Primary Purchased Electricity Reporting Method: Market-Based</p>
        <small>* Not included in totals</small>
        <ol className="my-4">
          <li>
            Location-based reporting reflects the average emissions intensity of
            electricity supplied through the UK's grid. Market-based reporting
            reflects the reporting organisation's specific electricity
            purchasing choices.
          </li>
          <li>
            Biogenic emissions from scope 1 & 2 activity and Scope 3 Categories
            4, 6, 7(a) & 9
          </li>
        </ol>
        <ul className="my-4">
          <li>
            RC <Badge fade="success">Relevant</Badge>
            <Badge fade="success">Calculated</Badge>
          </li>
          <li>
            RNC <Badge fade="success">Relevant</Badge>
            <Badge fade="danger">Not calculated</Badge>
          </li>
          <li>
            NR <Badge fade="secondary">Not relevant</Badge>
          </li>
        </ul>
      </ReportContents>
      <div className="border-bottom"></div>
    </React.Fragment>
  );
}

export default Notes;
