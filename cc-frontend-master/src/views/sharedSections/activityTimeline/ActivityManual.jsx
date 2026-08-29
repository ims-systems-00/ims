import { Activity, Button, CardBody } from "@ims-systems-00/ims-ui-kit";
import React, { useState } from "react";
import defaultAvatar from "../../../assets/image/default-avatar.png";
import CommentInput from "./CommentInput";
import RichText from "../components/RichText";
import { useApplication } from "../../../store/applicationStore";
import If from "../../../components/If";
import moment from "moment";

const userNotFound = <span className="text-danger">"User not found"</span>;
function ActivityManual({
  activity = null,
  onUpdate = async function () {},
  onDelete = function () {},
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { currentUserData } = useApplication();
  const activityContent = (
    <If expression={activity}>
      <If expression={isEditing}>
        <CommentInput
          comment={activity?.value}
          onUpdate={async function (data) {
            if (typeof onUpdate === "function") await onUpdate(data);
            setIsEditing(false);
          }}
          onCancel={function () {
            setIsEditing(false);
          }}
          submitButtonVariant="footer"
        />
      </If>
      <If expression={!isEditing}>
        <CardBody className="py-0">
          <RichText value={activity?.value} readOnly />
        </CardBody>
      </If>
    </If>
  );
  let footer = (
    <If expression={activity && !isEditing}>
      <If expression={currentUserData?._id === activity?.created?.by?._id}>
        <Button
          size="sm"
          color="primary"
          outline
          className="border-0 p-1"
          onClick={function () {
            setIsEditing(true);
          }}
        >
          Edit
        </Button>
        <span></span>
        <Button
          size="sm"
          color="danger"
          outline
          className="border-0 p-1"
          onClick={function () {
            if (typeof onDelete === "function") onDelete(activity._id);
          }}
        >
          Delete
        </Button>
      </If>
    </If>
  );
  return (
    <React.Fragment>
      <Activity
        name={activity?.created?.by?.name || userNotFound}
        subHeading={moment(activity?.createdAt).format("DD/MM/YYYY HH:mm")}
        avatar={activity?.created?.by?.profileImageSrc || defaultAvatar}
        activity={activityContent}
        footer={footer}
      />
    </React.Fragment>
  );
}

export default ActivityManual;
