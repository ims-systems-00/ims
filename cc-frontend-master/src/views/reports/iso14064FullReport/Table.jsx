import { Table } from "@ims-systems-00/ims-ui-kit";
import React from "react";

const EmissionsTable = ({ data }) => {
  return (
    <Table bordered>
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Examples</th>
          <th>Relevance</th>
          <th>Explanation</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => {
          console.log(row)
          return (
          <tr key={index} className={row.relevance === 'Not relevant' ? 'text-muted' : ''}>
            <td>{row.category}</td>
            <td>{row.description}</td>
            <td>{row.examples}</td>
            <td>{row.relevance}</td>
            <td>{row.explanation}</td>
          </tr>
        )})}
      </tbody>
    </Table>
  );
};

const DataQualityInformationTable = ({ data }) => {
  return (
    <Table bordered>
      <thead>
        <tr>
          <th>Grade</th>
          <th>Definition</th>
          <th>Activity Data Criteria</th>
          <th>Emission Factor Criteria</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            <td>{row.grade}</td>
            <td>{row.definition}</td>
            <td>{row.activityDataCriteria}</td>
            <td>{row.emissionFactorCriteria}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export { EmissionsTable, DataQualityInformationTable };