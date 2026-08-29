import { Button, Container, Navbar } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApplication } from "../../store/applicationStore";
import { OrganisationProvider } from "../../store/organisationStore";
import LoginWithOrgProtected from "../LoginWithOrgProtected";
import logo from "images/logo.png";
import imsTechnologiesLogo from "../../assets/image/ims-technologies-full-logo.svg";

function OnboardingLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarToggled, setSidebarToggled] = React.useState(false);
  const [searchBoxOpen, setSearchBoxOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUserData } = useApplication();
  return (
    <LoginWithOrgProtected>
      <OrganisationProvider>
        <Container className="vh-100 py-4 d-flex">
          <div className="onboarding-layout overflow-hidden position-relative rounded-3">
            <Navbar
              className="nav position-absolute top-0 p-2"
              expand="lg"
              container="fluid"
            >
              <img className="logo img-fluid" src={logo} />
              <div className="d-flex ms-auto py-1">
                <Link to="/accounts/settings">
                  <div className="d-inline-flex">
                    <p className="py-1 d-none d-md-block">
                      Welcome, {currentUserData?.name}
                    </p>
                    <div id="profile-link" className="flex-shrink-0 mx-md-2">
                      <img
                        src={
                          currentUserData?.profileImageSrc ||
                          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIQctMpfDaRxFb7YrryqRe1-2hK2r1getr-w&usqp=CAU"
                        }
                        alt="avatar"
                        className="avatar"
                      />
                    </div>
                  </div>
                </Link>
              </div>
            </Navbar>
            <Outlet />
            <Navbar
              className="nav position-absolute bottom-0 p-2"
              expand="lg"
              container="fluid"
            >
              <p className="d-inline me-3">Carbo-Calc</p>{" "}
              <p className="d-inline me-3">Powerd By</p>{" "}
              <img className="logo img-fluid" src={imsTechnologiesLogo} />{" "}
              <div className="d-flex text-light ms-auto py-1">
                2024 iMS Technologies all rights reserved.
              </div>
            </Navbar>
          </div>
        </Container>
      </OrganisationProvider>
    </LoginWithOrgProtected>
  );
}

export default OnboardingLayout;
