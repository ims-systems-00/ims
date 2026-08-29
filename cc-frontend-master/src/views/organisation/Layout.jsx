import React from "react";
import { BiCog } from "react-icons/bi";
import { Outlet } from "react-router-dom";
import Navigationbar from "../../components/Navigationbar";
const navigations = [
  {
    path: "",
    text: "Details",
    icon: <BiCog />,
  },
].map((item) => ({ ...item, path: "/organisation" + item.path }));

function Layout() {
  return (
    <>
      <Navigationbar navigaions={navigations} sticky={"top"} />
      <div className="content">
        <Outlet />
      </div>
    </>
  );
}

export default Layout;
