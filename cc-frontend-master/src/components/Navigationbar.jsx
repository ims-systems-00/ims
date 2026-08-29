import {
  Collapse,
  Nav,
  NavItem,
  NavLink,
  Navbar,
  NavbarToggler,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import TourStep from "./TourStep";
function Navigationbar({
  activeTabIdex = null,
  navigaions = [],
  children,
  ...rest
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggle = () => setIsOpen(!isOpen);
  const location = useLocation();
  return (
    <React.Fragment>
      <Navbar
        expand="md"
        className={"bg-white border-bottom pb-md-0"}
        {...rest}
      >
        <NavbarToggler className={"ms-auto"} onClick={toggle} />
        <Collapse timeout={3000} isOpen={isOpen} navbar>
          <Nav className="me-auto" pills navbar>
            {navigaions.map((navigation, i) => {
              let url = new URL(
                window.location.protocol +
                  "//" +
                  window.location.hostname +
                  navigation.path
              );
              let pathname = url.pathname;
              return (
                <NavItem key={uuidv4()} active={location.pathname === pathname}>
                  <TourStep stepId={navigation.id}>
                    <Link to={navigation.path}>
                      <NavLink>
                        {navigation.icon} {navigation.text}
                      </NavLink>
                    </Link>
                  </TourStep>
                </NavItem>
              );
            })}
          </Nav>
          {children}
        </Collapse>
      </Navbar>
    </React.Fragment>
  );
}

export default Navigationbar;
