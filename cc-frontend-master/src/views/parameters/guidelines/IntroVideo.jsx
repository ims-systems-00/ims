import { Button, Modal, ModalBody, ModalHeader } from "@ims-systems-00/ims-ui-kit";
import CourseTile from "../../../components/CourseTile";
import YouTube from "react-youtube";
import { useState } from "react";

export function IntroVideo() {
  const [showModal, setShowModal] = useState(false);
  return (
    <div>
      <CourseTile
        contentCounts={1}
        contentType="minute"
        name="Carbon Calculator Intro"
        description="Get an overview of the Carbon Calculator and its features in simple steps."
        ctaText="Watch Tutorial"
        onStart={() => {
          setShowModal(true);
        }}
      />
      <Modal isOpen={showModal} toggle={() => setShowModal(!showModal)} centered>
        <ModalHeader>Carbon Calculator Intro</ModalHeader>
        <ModalBody>
          <YouTube
            videoId={"hkpY2r_hBwE"}
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
