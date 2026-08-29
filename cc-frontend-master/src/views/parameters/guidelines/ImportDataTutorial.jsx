import { Button, Modal, ModalBody, ModalHeader } from "@ims-systems-00/ims-ui-kit";
import CourseTile from "../../../components/CourseTile";
import YouTube from "react-youtube";
import { useState } from "react";

export function ImportDataTutorial() {
  const [showModal, setShowModal] = useState(false);
  return (
    <div>
      <CourseTile
        contentCounts={1}
        contentType="minute"
        name="Importing Data"
        description="Learn how to import data from a CSV file using the Import Data feature."
        ctaText="Watch Tutorial"
        onStart={() => {
          setShowModal(true);
        }}
      />
      <Modal isOpen={showModal} toggle={() => setShowModal(!showModal)} centered>
        <ModalHeader>Import Data Tutorial</ModalHeader>
        <ModalBody>
          <YouTube
            videoId={"RLBXy8FLIOo"}
            opts={{
              height: "390",
              width: "100%",
              playerVars: {
                autoplay: 1,
              },
            }}
          />
          <Button className="pull-right" size="sm" color="danger" onClick={() => setShowModal(false)}>Close</Button>
        </ModalBody>
      </Modal>
    </div>
  );
}
