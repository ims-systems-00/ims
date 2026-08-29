import React from "react";
import { FaRegComment } from "react-icons/fa";
import { MdOutlineViewDay } from "react-icons/md";
import CategoryIcon from "../../../../components/CategoryIcon";
import NavigationTabs from "../../../../components/NavigationTabs";
import { useInitiatives } from "../store";
import { VscDebugStepOut } from "react-icons/vsc";
import Comments from "./Comments";
import Details from "./Details";
export default function Drawer({}) {
  const { viewingInitiative } = useInitiatives();
  if (!viewingInitiative) return null;
  return (
    <div className="category-drawer">
      <div className="d-flex">
        <div className="md-icon-container me-3">
          <VscDebugStepOut />
        </div>
        <div>
          <h4 className="font-weight-bold">{viewingInitiative.title}</h4>
          <p>Reference: {viewingInitiative.reference}</p>
        </div>
      </div>
      <NavigationTabs
        navigations={[
          {
            id: "cc-input-setting",
            text: "Details",
            icon: <MdOutlineViewDay />,
            component: <Details />,
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
