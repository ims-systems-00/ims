import { useState, useEffect } from "react";
import * as attachmentService from "../../services/attachmentService";
import useAPIResponse from "../../hooks/apiResponse";

function useAttachments({ module = undefined, moduleType = undefined }) {
  const [attachments, setAttachments] = useState([]);
  const { handleError, handleSuccess } = useAPIResponse();
  async function listAttachments() {
    try {
      const response = await attachmentService.listAttachments({
        query: `module=${module}&moduleType=${moduleType}`,
      });
      setAttachments(response?.data?.attachments);
    } catch (err) {
      handleError(err);
    }
  }
  async function createAttachment(payload) {
    try {
      let response = await attachmentService.createAttachment({
        ...payload,
        module,
        moduleType,
      });
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }

  async function createAttachmentAndAddToList(payload) {
    let response = await createAttachment(payload);
    if (response?.data?.attachment)
      setAttachments((locs) => [response?.data?.attachment, ...locs]);
  }
  // get
  async function getAttachment(id) {
    try {
      let response = await attachmentService.getAttachment(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  // delete
  async function hardDeleteAttachment(id) {
    try {
      let response = await attachmentService.hardDeleteAttachment(id);
      handleSuccess(response);
      return response;
    } catch (err) {
      handleError(err);
    }
  }
  async function hardDeleteAttachmentFromList(id) {
    let response = await hardDeleteAttachment(id);
    if (response?.data?.attachment)
      setAttachments((locs) => locs.filter((l) => l._id !== id));
  }
  useEffect(() => {
    listAttachments();
  }, [module, moduleType]);
  return {
    attachments,
    createAttachment,
    createAttachmentAndAddToList,
    listAttachments,
    getAttachment,
    hardDeleteAttachment,
    hardDeleteAttachmentFromList,
  };
}
export default useAttachments;
