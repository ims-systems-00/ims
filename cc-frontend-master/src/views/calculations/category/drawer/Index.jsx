import React from "react";
import { FaRegComment } from "react-icons/fa";
import { LuCloudCog } from "react-icons/lu";
import { MdOutlineViewDay } from "react-icons/md";
import { PiCarSimple } from "react-icons/pi";
import NavigationTabs from "../../../../components/NavigationTabs";
import { useCategoryCalculation } from "../store";
import InputSettings from "./InputSettings";
import Outputs from "./Outputs";
import Comments from "./Comments";
import CategoryIcon from "../../../../components/CategoryIcon";
export default function Drawer({}) {
  const { viewingCategoryCalculation } = useCategoryCalculation();
  if (!viewingCategoryCalculation) return null;
  return (
    <div className="category-drawer">
      <div className="d-flex">
        <div className="md-icon-container me-3">
          <CategoryIcon category={viewingCategoryCalculation.category} />
        </div>
        <div>
          <h4 className="font-weight-bold">
            {viewingCategoryCalculation.activity}
          </h4>
          <p>Reference: {viewingCategoryCalculation.reference}</p>
        </div>
      </div>
      <NavigationTabs
        navigations={[
          {
            id: "cc-input-setting",
            text: "Input settings",
            icon: <MdOutlineViewDay />,
            component: <InputSettings />,
          },
          {
            id: "cc-output-emission",
            text: "GHG Emissions",
            icon: <LuCloudCog />,
            component: <Outputs />,
          },
          {
            id: "cc-calculation-comments",
            text: "Comments",
            icon: <FaRegComment />,
            component: <Comments />,
          },
        ]}
      />
    </div>
  );
}
