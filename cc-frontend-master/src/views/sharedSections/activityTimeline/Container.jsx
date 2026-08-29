import React from "react";
import ActivityAutomated from "./ActivityAutomated";
import ActivityManual from "./ActivityManual";
import CommentInput from "./CommentInput";
import CommentsFilter from "./CommentsFilter";
import { useActivity } from "./store";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Button } from "@ims-systems-00/ims-ui-kit";
function Container({}) {
  const {
    activities,
    createActivityAndAddToList,
    updateActivityAndModifyInTheList,
    deleteActivityFromList,
    hasMoreActivities,
    loadNextPage,
  } = useActivity();
  const [activitiesListRef] = useAutoAnimate();
  return (
    <div className="py-2">
      <CommentInput
        onCreate={async function (data) {
          await createActivityAndAddToList({ value: data.comment });
        }}
      />
      <CommentsFilter />
      <div className="my-2" ref={activitiesListRef}>
        {activities.map((activity) => {
          if (activity.isAutomated)
            return (
              <ActivityAutomated key={activity?._id} activity={activity} />
            );
          if (!activity.isAutomated)
            return (
              <ActivityManual
                key={activity?._id}
                activity={activity}
                onUpdate={async function (data) {
                  await updateActivityAndModifyInTheList(activity._id, {
                    value: data.comment,
                  });
                }}
                onDelete={async function () {
                  await deleteActivityFromList(activity._id);
                }}
              />
            );
        })}
      </div>
      <div className="text-center px-3">
        <Button
          size="sm"
          color="light"
          className="border-0 rounded-pill"
          onClick={loadNextPage}
        >
          {hasMoreActivities()
            ? "Load more activities"
            : "You've reached the bottom"}
        </Button>
      </div>
    </div>
  );
}

export default Container;
