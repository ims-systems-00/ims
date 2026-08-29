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
import { FiPieChart } from "react-icons/fi";

import { TbFileStack } from "react-icons/tb";

function Navigationbar({ reportName = "Untitled", children, ...rest }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggle = () => setIsOpen(!isOpen);
  const location = useLocation();
  return (
    <React.Fragment>
      <Navbar expand="md" className={"bg-white pb-md-0"} {...rest}>
        <NavbarToggler className={"ms-auto"} onClick={toggle} />
        <Collapse timeout={3000} isOpen={isOpen} navbar>
          <Nav className="me-auto" pills navbar>
            <NavItem>
              <Link to={"/reports"}>
                <NavLink>
                  <TbFileStack /> All reports
                </NavLink>
              </Link>
            </NavItem>
            {/* <NavItem>
              <NavLink>
                <FiPieChart /> {reportName}
              </NavLink>
            </NavItem> */}
          </Nav>
          {children}
        </Collapse>
      </Navbar>
    </React.Fragment>
  );
}

export default Navigationbar;
