import React from "react";
import { useAttachmentSection } from "./store";
import Attachment from "../../../components/Attachment";
import FileDropZone from "../../../components/FileDropZone";
import { downloadFileFromS3 } from "../../../services/fileHandlerService";

function Attachments() {
  const {
    attachments,
    createAttachmentAndAddToList,
    hardDeleteAttachmentFromList,
  } = useAttachmentSection();
  return (
    <React.Fragment>
      <FileDropZone
        height={80}
        onLoad={async (files) => {
          await Promise.all(
            files.map((file) => createAttachmentAndAddToList({ file }))
          );
        }}
      />
      {attachments.map((attachment) => {
        return (
          <Attachment
            fileStructure={{
              ...attachment.fileMetaInfo,
              modified: {
                by: attachment?.createdBy?.name,
                on: attachment?.createdAt,
              },
            }}
            onDownload={() => downloadFileFromS3(attachment.fileMetaInfo)}
            onDelete={() => hardDeleteAttachmentFromList(attachment?._id)}
          />
        );
      })}
    </React.Fragment>
  );
}

export default Attachments;
