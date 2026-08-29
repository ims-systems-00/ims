import { Activity, Card, CardBody, CardHeader } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import emptyIcon from "../../../assets/image/empty-icon.png";
import If from "../../../components/If";
const notFound = <span className="text-danger">"Not found"</span>;
function ExtraLog({ image = emptyIcon, title = "", description = "" }) {
  return (
    <Card className="shadow-none bg-light border-0 py-2 mx-3">
      <CardHeader className="border-0  d-flex">
        <img
          alt="extra-log-icon"
          img={image}
          className="avatar-sm me-1 border"
        />
        <span className="mb-0">{title}</span>
      </CardHeader>
      <CardBody className="pt-2">
        <p className="white-space-pre-wrap">{description?.trim()}</p>
      </CardBody>
    </Card>
  );
}
function ActivityAutomated({ activity = null }) {
  let extraLogs = (
    <If expression={activity?.extraLogs?.length}>
      {activity?.extraLogs?.map((log) => (
        <ExtraLog
          key={log?._id}
          image={log?.image}
          title={log.title}
          description={log.description}
        />
      ))}
    </If>
  );
  return (
    <React.Fragment>
      <Activity
        name={activity?.value || notFound}
        avatar={activity?.iconSrc || emptyIcon}
        activity={extraLogs}
        footer={null}
      />
    </React.Fragment>
  );
}

export default ActivityAutomated;
