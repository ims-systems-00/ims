import { Container } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApplication } from "../../store/applicationStore";
import { OrganisationProvider } from "../../store/organisationStore";
import LoginWithOrgProtected from "../LoginWithOrgProtected";
import { ParametersContextProvider } from "../../store/parametersStore";

function DataImportLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarToggled, setSidebarToggled] = React.useState(false);
  const [searchBoxOpen, setSearchBoxOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUserData } = useApplication();
  return (
    <LoginWithOrgProtected>
      <ParametersContextProvider>
        <OrganisationProvider>
          <Container className="mh-100 py-4">
            <Outlet />
          </Container>
        </OrganisationProvider>
      </ParametersContextProvider>
    </LoginWithOrgProtected>
  );
}

export default DataImportLayout;
