import classNames from "classnames";
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { PiCaretUpDownBold } from "react-icons/pi";
import { BiImport } from "react-icons/bi";
import { TbSitemap } from "react-icons/tb";
import { WiSmoke } from "react-icons/wi";
import { Outlet, useNavigate } from "react-router-dom";
import Navigationbar from "../../components/Navigationbar";
import CC_CONSTANTS from "../../constants";
import { CategoryContextProvider, useCategory } from "./stores/categoryStore";
import CategoryIcon from "../../components/CategoryIcon";

function CategoriesNavigation() {
  const { category, getRelevanceForCategory } = useCategory();
  const navigate = useNavigate();
  return (
    <UncontrolledDropdown>
      <DropdownToggle className="border-0 text-dark">
        {category} <PiCaretUpDownBold />
      </DropdownToggle>
      <DropdownMenu className={"mb-3"}>
        {Object.values(CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES).map((cat) => {
          return (
            <DropdownItem
              className={classNames("", {
                "text-primary": category === cat,
                "text-muted":
                  getRelevanceForCategory(cat) ===
                  CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT,
              })}
              key={cat}
              disabled={
                getRelevanceForCategory(cat) ===
                CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT
              }
              onClick={() => {
                // if (
                //   getRelevanceForCategory(cat) ===
                //   CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT
                // )
                //   return toast.error(
                //     "This category is marked as " +
                //       CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT
                //   );
                navigate("/categories?category=" + cat);
              }}
            >
              <CategoryIcon category={cat} /> {cat}
              {getRelevanceForCategory(cat) ===
                CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT && "(NR)"}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

function Contents() {
  const { category } = useCategory();
  if (!category) return null;
  const navigations = [
    {
      id: "carbon-emissions-tab",
      path: "?category=" + category,
      text: "Carbon Emissions",
      icon: <WiSmoke />,
    },
    {
      id: "custom-factors-tab",
      path: "/custom-factors",
      text: "Custom Factors",
      icon: <TbSitemap />,
    },
    {
      id: "data-import-tab",
      path: "/data-import",
      text: "Import Data",
      icon: <BiImport />,
    },
  ].map((item) => ({ ...item, path: "/categories" + item.path }));
  return (
    <React.Fragment>
      <Navigationbar activeTabIdex={0} navigaions={navigations} sticky={"top"}>
        <CategoriesNavigation />
      </Navigationbar>
      <div className="content">
        <Outlet />
      </div>
    </React.Fragment>
  );
}

function CategoryLayout() {
  return (
    <CategoryContextProvider>
      <Contents />
    </CategoryContextProvider>
  );
}

export default CategoryLayout;
