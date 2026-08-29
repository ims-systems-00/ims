import React, { useState } from "react";
import CategoryTile from "../../../components/CategoryTile";
import { Col, Row } from "@ims-systems-00/ims-ui-kit";
import CategoryFilters, {
  categoryFilters,
} from "../../../components/CategoryFilters";
import CC_CONSTANTS from "../../../constants";
import { useReportingBoundaries } from "./store";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import TourStep from "../../../components/TourStep";

function Categories() {
  const [filter, setFilter] = useState(categoryFilters.all.value);
  const { reportingBoundaries, updateReportingBoundaryAndModifyInTheList } =
    useReportingBoundaries();
  const [scopesContainerRef] = useAutoAnimate();
  return (
    <div ref={scopesContainerRef}>
      <CategoryFilters onFilter={(f) => setFilter(f)} />
      {CC_CONSTANTS.CC_CATEGTORIES_WITH_DETAILS.filter(
        (section) =>
          filter === categoryFilters.all.value || section.scope === filter
      ).map((section) => {
        return (
          <React.Fragment key={section.title}>
            <h5 className="my-3">{section.title}</h5>
            <Row className={""}>
              {section.categories.map((category) => {
                let relevance =
                  reportingBoundaries.find(
                    (boundary) => boundary.category === category.name
                  )?.relevance || "";
                let boundaryId =
                  reportingBoundaries.find(
                    (boundary) => boundary.category === category.name
                  )?._id || "";
                return (
                  <Col key={category.name} md="4">
                    <TourStep stepId={category.name}>
                      <CategoryTile
                        name={category.name}
                        description={category.description}
                        example={category.example}
                        relevance={relevance}
                        explanation={category.explanation[relevance]}
                        onSelectRelevance={(relevance) =>
                          updateReportingBoundaryAndModifyInTheList(
                            boundaryId,
                            {
                              relevance,
                            }
                          )
                        }
                      />
                    </TourStep>
                  </Col>
                );
              })}
            </Row>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Categories;
