import { Alert } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { FiCheckCircle } from "react-icons/fi";
import RichText from "../../../sharedSections/components/RichText";
import { useInitiatives } from "../store";
import { MdOutlinePending } from "react-icons/md";
import moment from "moment";
export default function InputSettings({}) {
  const { viewingInitiative } = useInitiatives();
  if (!viewingInitiative) return null;

  return (
    <React.Fragment>
      <h6 className="mt-3">Initative status</h6>
      {viewingInitiative.implementedAt && (
        <Alert color="success" className="border border-success">
          <FiCheckCircle />
          <span className="ms-2">
            This Initiative was implemented on{" "}
            {moment(viewingInitiative.implementedAt).format("DD/MM/YYYY")}
          </span>
        </Alert>
      )}
      {!viewingInitiative.implementedAt && (
        <Alert color="warning" className="border border-warning">
          <MdOutlinePending />
          <span className="ms-2">
            This Initiative was identified on{" "}
            {moment(viewingInitiative.identifiedAt).format("DD/MM/YYYY")}. But
            it's still not implemented.
          </span>
        </Alert>
      )}
      <h6>Description</h6>
      <RichText
        className="bg-secondary-extra-light"
        readOnly
        value={viewingInitiative.description}
      />
      <h6>Potential Co-Benefits</h6>
      <RichText
        className="bg-secondary-extra-light"
        readOnly
        value={viewingInitiative.potentialCoBenefits}
      />
      <h6>Potential Unintended Consequences</h6>
      <RichText
        className="bg-secondary-extra-light"
        readOnly
        value={viewingInitiative.potentialUnintendedConsequences}
      />
    </React.Fragment>
  );
}
