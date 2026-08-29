import React from "react";
import { Spinner } from "@ims-systems-00/ims-ui-kit";
import { useListMemberships } from "./hooks/useListMemberships";
import { useApplication } from "../../store/applicationStore";
import { refreshProfileCache } from "../../services/userService";
import { useNavigate } from "react-router-dom";
import PerfectScrollbar from "react-perfect-scrollbar";
import { FaUsers, FaHandshake } from "react-icons/fa";

const OrganisationSelection = () => {
  const navigate = useNavigate();
  const { memberships, isLoading } = useListMemberships();
  const { switchIntoOrganisation } = useApplication();

  const handleSelect = async (membership) => {
    try {
      if (!membership?.organization?._id) {
        throw new Error(
          `Invalid organization ID: ${
            membership?.organization?._id
          }. Organization data: ${JSON.stringify(membership?.organization)}`
        );
      }

      await switchIntoOrganisation(membership.organization._id);

      navigate("/dashboard");
    } catch (error) {
      console.error("Error switching organization:", error);
      alert(`Failed to switch organization: ${error.message}`);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row">
          <div className="col-md-6 mx-auto">
            <div className="text-center mb-4">
              <h5 className="text-dark">Elevate Your Business Operations</h5>
              <p className="mb-3">Please check-in to relevant organisation.</p>
            </div>

            <div className="org-selection-container w-50 mx-auto">
              <PerfectScrollbar>
                {isLoading ? (
                  <p className="text-center">
                    <Spinner size="sm" /> Please wait until we prepare the
                    system for you...
                  </p>
                ) : (
                  <React.Fragment>
                    {memberships && memberships.length > 0 ? (
                      memberships.map((m, index) => (
                        <div
                          key={index}
                          className="org-name rounded-3 border border-primary shadow-sm p-3 mb-2"
                          onClick={() => handleSelect(m)}
                        >
                          {m.organization?.name}
                          <small className="pull-right">
                            {m.organization?.isCustomer && (
                              <FaUsers
                                title="Customer"
                                className="text-primary"
                                style={{ fontSize: "16px" }}
                              />
                            )}
                            {m.organization?.isPartner && (
                              <FaHandshake
                                title="Partner"
                                className="text-primary"
                                style={{ fontSize: "16px" }}
                              />
                            )}
                          </small>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted">
                        <p>No valid organizations found.</p>
                        <p>
                          Please contact your administrator to ensure your
                          organization is properly configured.
                        </p>
                      </div>
                    )}
                  </React.Fragment>
                )}
              </PerfectScrollbar>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganisationSelection;
