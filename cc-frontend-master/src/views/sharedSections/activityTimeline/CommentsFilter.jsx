import { Button } from "@ims-systems-00/ims-ui-kit";
import React, { useState } from "react";
import { useActivity } from "./store";
const filterLabels = {
  allAcitivities: "All activities",
  autoAcitivities: "Automated",
  commentAcitivities: "Comments",
};
function CommentsFilter({}) {
  const [activeFilter, setActiveFilter] = useState("");
  const {
    applyDefaultFilterInTheList,
    applyCommentsOnlyFilterInTheList,
    applyAutomatedActivitiesOnlyFilterInTheList,
  } = useActivity();
  return (
    <div className="my-2">
      <span className="text-dark me-2">Show</span>
      <Button
        size={"sm"}
        color={
          activeFilter === filterLabels.allAcitivities ? "primary" : "secondary"
        }
        className="rounded-pill border-0"
        onClick={() => {
          applyDefaultFilterInTheList();
          setActiveFilter(filterLabels.allAcitivities);
        }}
      >
        All activities
      </Button>
      <Button
        size={"sm"}
        color={
          activeFilter === filterLabels.commentAcitivities
            ? "primary"
            : "secondary"
        }
        className="rounded-pill border-0"
        onClick={() => {
          applyCommentsOnlyFilterInTheList();
          setActiveFilter(filterLabels.commentAcitivities);
        }}
      >
        Comments
      </Button>
      <Button
        size={"sm"}
        color={
          activeFilter === filterLabels.autoAcitivities
            ? "primary"
            : "secondary"
        }
        className="rounded-pill border-0"
        onClick={() => {
          applyAutomatedActivitiesOnlyFilterInTheList();
          setActiveFilter(filterLabels.autoAcitivities);
        }}
      >
        Automated
      </Button>
    </div>
  );
}

export default CommentsFilter;
