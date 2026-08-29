import { Col, Row } from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import CourseTile from "../../../components/CourseTile";
import { useTour } from "../../../components/Tour";
import useCourses from "../../../hooks/courses";
import { ImportDataTutorial } from "./ImportDataTutorial";
import { useNavigate } from "react-router-dom";
import { IntroVideo } from "./IntroVideo";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function Guidelines() {
  const { startTour } = useTour();
  const courses = useCourses();
  const navigate = useNavigate();

  return (
    <div className="guidelines-container">
      <Row>
        <Col md="4">
          <CourseTile
            contentCounts={13}
            contentType="pages"
            name="General Guidelines"
            description="Get an overview of the general usage of the system and the system's features."
            ctaText="Read More"
            onStart={() => {
              navigate("/parameters/overview-document");
            }}
          />
        </Col>
        {Object.keys(courses).map((course) => {
          return (
            <Col md="4">
              <CourseTile
                contentCounts={courses[course].steps.length}
                contentType="steps"
                name={courses[course].name}
                description={courses[course].description}
                ctaText="Start Tour"
                onStart={() => {
                  startTour(courses[course]);
                }}
              />
            </Col>
          );
        })}
        <Col md="4">
          <IntroVideo />
        </Col>
        <Col md="4">
          <ImportDataTutorial />
        </Col>
      </Row>
    </div>
  );
}

export default Guidelines;
