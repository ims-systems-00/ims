import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  UncontrolledDropdown,
  Spinner,
} from "@ims-systems-00/ims-ui-kit";
import moment from "moment";
import React, { useState } from "react";
import { AiOutlineDownload } from "react-icons/ai";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { ImAttachment } from "react-icons/im";
import { RiDeleteBin5Line } from "react-icons/ri";
import { getAttachmentImage } from "../lib";
function haveSameFileStructure(
  obj1,
  obj2 = {
    Name: "",
    Key: "",
    key: "",
    Bucket: "",
    modified: { by: "", on: "" },
  }
) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false;
    }
  }

  return true;
}
const states = {
  inProgress: "in-progress",
  static: "static",
};
function Attachment({
  fileStructure = {},
  disableOptions = false,
  onDownload = async () => {},
  onDelete = async () => {},
}) {
  const [downloadState, setDownloadState] = useState(states.static);
  const [deleteState, setDeleteState] = useState(states.static);
  if (!haveSameFileStructure(fileStructure))
    return (
      <div className="bg-secondary-extra-light rounded-2 mb-2 p-3 d-flex align-items-center">
        <ImAttachment size={20} />
        <div className="ms-3">
          <p className="text-dark">Invalid attachment.</p>
          <small className="text-secondary">
            This attachment has been removed or not found.
          </small>
        </div>
      </div>
    );

  async function handleDownload() {
    try {
      setDownloadState(states.inProgress);
      await onDownload();
    } catch (err) {
      console.log(err);
    }
    setDownloadState(states.static);
  }
  async function handleDelete() {
    try {
      setDeleteState(states.inProgress);
      await onDelete();
    } catch (err) {
      console.log(err);
    }
    setDeleteState(states.static);
  }
  return (
    <div className="bg-secondary-extra-light rounded-2 mb-2 p-3 d-flex align-items-center">
      <img src={getAttachmentImage(fileStructure.name)} style={{ width: 20 }} />
      <div className="ms-3 flex-grow-1">
        <p className="text-dark">{fileStructure.Name} </p>
        <small className="text-secondary">
          Modified by {fileStructure.modified?.by} on{" "}
          {moment(fileStructure.modified?.on).format("DD/MM/YYYY hh:mm")}{" "}
        </small>
      </div>
      {!disableOptions && (
        <UncontrolledDropdown className="mt-row-actions">
          <DropdownToggle size="sm" outline className="border-0">
            {deleteState === states.inProgress ||
            downloadState === states.inProgress ? (
              <Spinner size="sm" />
            ) : (
              <HiOutlineDotsHorizontal />
            )}
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={handleDownload}>
              {downloadState === states.inProgress ? (
                <Spinner size="sm" />
              ) : (
                <AiOutlineDownload />
              )}{" "}
              Download
            </DropdownItem>
            <DropdownItem onClick={handleDelete}>
              {deleteState === states.inProgress ? (
                <Spinner size="sm" />
              ) : (
                <RiDeleteBin5Line />
              )}{" "}
              Delete
            </DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      )}
    </div>
  );
}

export default Attachment;
