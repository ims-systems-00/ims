import React from "react";
import Attachments from "./Attachments";
import { AttachmentSectionContextProvider } from "./store";

function AttachmentsSection({ module = null, moduleType = null }) {
  return (
    <AttachmentSectionContextProvider module={module} moduleType={moduleType}>
      <Attachments />
    </AttachmentSectionContextProvider>
  );
}

export default AttachmentsSection;
