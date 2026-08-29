import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  Navbar,
} from "@ims-systems-00/ims-ui-kit";
import brandConfig from "config.js";
import logo from "images/logo-white.png";
import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { HiMenuAlt2 } from "react-icons/hi";
import { IoMdLogOut } from "react-icons/io";
import { PiBellBold } from "react-icons/pi";
import { RiMenuUnfoldLine, RiMenuUnfold2Line } from "react-icons/ri";
import { FaQuestion } from "react-icons/fa6";

import {
  Menu,
  MenuItem,
  Sidebar,
  menuClasses,
  sidebarClasses,
} from "react-pro-sidebar";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import TourStep from "../../components/TourStep";
import { useApplication } from "../../store/applicationStore";
import { OrganisationProvider } from "../../store/organisationStore";
import { ParametersContextProvider } from "../../store/parametersStore";
import LoginWithOrgProtected from "../LoginWithOrgProtected";
import { SearchFactors } from "./SearchFactors";
import { sidebarData } from "./sidebarData";
import { RiSearch2Line } from "react-icons/ri";

const menuStyles = {
  padding: "7px",
  [`.${menuClasses.button}`]: {
    borderRadius: "8px",
    transition: ".3s ease-in-out",
    height: "auto",
    paddingRight: "15px",
    paddingLeft: "15px",
    paddingBottom: "10px",
    paddingTop: "10px",
    color: "white",
    marginBottom: "2px",
    "&:hover": {
      backgroundColor: brandConfig.primaryAccentColor + " !important",
      color: brandConfig.primaryAccentTextColor,
    },
    ["&." + menuClasses.active]: {
      backgroundColor: brandConfig.primaryAccentColor + " !important",
      color: brandConfig.primaryAccentTextColor,
    },
  },
};

function MainLayout() {
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
          <div className="main-layout">
            <Sidebar
              collapsed={sidebarCollapsed}
              toggled={sidebarToggled}
              customBreakPoint="764px"
              onBackdropClick={() => setSidebarToggled(false)}
              rootStyles={{
                position: "sticky",
                top: 0,
                left: 0,
                height: "100vh",
                borderRight: "1px solid #CED4DA",
                [`.${sidebarClasses.container}`]: {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: brandConfig.primaryColor,
                  position: "relative",
                  overflowY: "hidden",
                },
                [`&.${sidebarClasses.broken}`]: {
                  zIndex: 1051,
                },
              }}
            >
              <Menu rootStyles={menuStyles}>
                <MenuItem
                  rootStyles={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    // background: "white",
                  }}
                >
                  <div className="d-flex align-items-center">
                    <img
                      className="w-50 my-2 ms-2"
                      alt="brand-name"
                      src={logo}
                    />
                  </div>
                </MenuItem>
                <TourStep stepId={"sidebar-navigations"}>
                  {sidebarData.map((menuitem) => (
                    <TourStep key={menuitem.id} stepId={menuitem.id}>
                      <MenuItem
                        active={location.pathname === menuitem.path}
                        key={menuitem.path}
                        className="p-0"
                        icon={menuitem.icon}
                        onClick={() => navigate(menuitem.path)}
                      >
                        {menuitem.text}
                      </MenuItem>
                    </TourStep>
                  ))}
                </TourStep>
              </Menu>
              <Menu rootStyles={menuStyles}>
                <MenuItem
                  className="my-auto p-0 flex-end"
                  icon={<FaQuestion />}
                  onClick={() => navigate("/support")}
                >
                  Get Support
                </MenuItem>
                <MenuItem
                  className="my-auto p-0 flex-end"
                  icon={<IoMdLogOut />}
                  onClick={() => navigate("/logout")}
                >
                  Logout
                </MenuItem>
              </Menu>
            </Sidebar>
            <div className="main-container">
              <Navbar className="nav bg-white" expand="lg" container="fluid">
                <Button
                  size={"sm"}
                  id="sidebar-toggler"
                  outline
                  className="d-md-none border-0"
                  onClick={() => {
                    setSidebarToggled((t) => !t);
                  }}
                >
                  <HiMenuAlt2 />
                </Button>
                <Button
                  size={"sm"}
                  onClick={(e) => {
                    setSidebarCollapsed((c) => !c);
                  }}
                  id="side-bar-size-controller"
                  outline
                  className="d-none d-md-inline border-0"
                >
                  {sidebarCollapsed ? (
                    <RiMenuUnfoldLine size={18} />
                  ) : (
                    <RiMenuUnfold2Line size={18} />
                  )}
                </Button>
                <Button
                  size={"sm"}
                  onClick={(e) => {
                    navigate(-1);
                  }}
                  id="history-navigation-back"
                  outline
                  className="d-none d-md-inline border-0"
                >
                  <FaChevronLeft />
                </Button>
                <Button
                  size={"sm"}
                  onClick={(e) => {
                    navigate(1);
                  }}
                  outline
                  className="d-none d-md-inline border-0"
                  id="history-navigation-forward"
                >
                  <FaChevronRight />
                </Button>
                <Button
                  size="sm"
                  className="rounded-pill border-0"
                  onClick={() => setSearchBoxOpen(true)}
                >
                  <RiSearch2Line className="me-2" /> Search Emission Activities
                </Button>
                <Modal centered backdrop={false} isOpen={searchBoxOpen}>
                  <ModalBody>
                    <SearchFactors
                      onNavigate={() => {
                        setSearchBoxOpen(false);
                      }}
                    />
                  </ModalBody>
                  <ModalFooter className="justify-content-end">
                    <Button
                      size="sm"
                      color="danger"
                      onClick={() => {
                        setSearchBoxOpen(false);
                      }}
                    >
                      Close
                    </Button>
                  </ModalFooter>
                </Modal>
                <div className="d-flex ms-auto py-1">
                  <Link to={"/profile/" + currentUserData?._id}>
                    <div className="d-inline-flex">
                      <div id="profile-link" className="flex-shrink-0 mx-md-2">
                        <img
                          src={
                            currentUserData?.profileImageSrc ||
                            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIQctMpfDaRxFb7YrryqRe1-2hK2r1getr-w&usqp=CAU"
                          }
                          alt="avatar"
                          className="avatar border border-2 border-primary"
                        />
                      </div>
                      <p className="py-1 d-none d-md-block">
                        {currentUserData?.name}
                      </p>
                    </div>
                  </Link>
                </div>
              </Navbar>

              <Outlet />
            </div>
          </div>
        </OrganisationProvider>
      </ParametersContextProvider>
    </LoginWithOrgProtected>
  );
}

export default MainLayout;
