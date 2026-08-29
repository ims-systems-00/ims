import { Button, Card, CardBody, Col, Row, } from "@ims-systems-00/ims-ui-kit";
import React, { useEffect } from "react";
import TextInput from "../../components/TextInput";
import { useOrganisation } from "../../store/organisationStore";
import {
  getOrganisationFormState,
  organisationFormValidaionSchema,
} from "./dto/organisation.dto";
import { MdArrowRightAlt } from "react-icons/md";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useForm } from "@ims-systems-00/ims-react-hooks";

function Configuration() {
  const {
    dataModel,
    handleChange,
    validationErrors,
    initiateDataModel,
    handleSubmit,
    isBusy,
  } = useForm(getOrganisationFormState(), organisationFormValidaionSchema);

  const { organisation, updateOrganisationAndMuteState } = useOrganisation();
  useEffect(() => {
    initiateDataModel(getOrganisationFormState(organisation));
  }, [organisation]);
  const [organisationref] = useAutoAnimate();
  return (
    <div ref={organisationref}>
      <Card className={"category-tile rounded-3 border-0"}>
        <CardBody>
          <h4 className={"mb-4"}>Company Information</h4>
          <Row>
            <Col md="6">
              <TextInput
                label="Company Name"
                value={dataModel.name}
                error={validationErrors.name}
                onChange={(changes) =>
                  handleChange({
                    field: "name",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            <Col md="6">
              <TextInput
                label="Company number"
                value={dataModel.companyNumber}
                error={validationErrors.companyNumber}
                onChange={(changes) =>
                  handleChange({
                    field: "companyNumber",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            {/* <Col md="6">
              <TextInput
                label="Contact Information"
                value={dataModel.officeEmail}
                error={validationErrors.officeEmail}
                onChange={(changes) =>
                  handleChange({
                    field: "officeEmail",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col> */}
            {/* <Col md="6">
              <TextInput
                label="Building"
                value={dataModel.addressBuilding}
                error={validationErrors.addressBuilding}
                onChange={(changes) =>
                  handleChange({
                    field: "addressBuilding",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col> */}
            <Col md="6">
              <TextInput
                label="Contact name"
                value={dataModel.contactName}
                error={validationErrors.contactName}
                onChange={(changes) =>
                  handleChange({
                    field: "contactName",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            <Col md="6">
              <TextInput
                label="Address"
                value={dataModel.addressStreet}
                error={validationErrors.addressStreet}
                onChange={(changes) =>
                  handleChange({
                    field: "addressStreet",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            <Col md="6">
              <TextInput
                label="Contact Email"
                value={dataModel.contactEmail}
                error={validationErrors.contactEmail}
                onChange={(changes) =>
                  handleChange({
                    field: "contactEmail",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            <Col md="6">
              <TextInput
                label="Contact Position"
                value={dataModel.contactPosition}
                error={validationErrors.contactPosition}
                onChange={(changes) =>
                  handleChange({
                    field: "contactPosition",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            {/* <Col md="6">
              <TextInput
                label="City"
                value={dataModel.addressCity}
                error={validationErrors.addressCity}
                onChange={(changes) =>
                  handleChange({
                    field: "addressCity",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            <Col md="6">
              <TextInput
                label="State/Province"
                value={dataModel.addressStateProvince}
                error={validationErrors.addressStateProvince}
                onChange={(changes) =>
                  handleChange({
                    field: "addressStateProvince",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col>
            <Col md="6">
              <TextInput
                label="Post code"
                value={dataModel.addressPostCode}
                error={validationErrors.addressPostCode}
                onChange={(changes) =>
                  handleChange({
                    field: "addressPostCode",
                    value: changes.currentTarget.value,
                  })
                }
              />
            </Col> */}
          </Row>
        </CardBody>
      </Card>
      <div className="d-grid gap-2 d-md-flex justify-content-md-end mb-2 px-3">
        <Button
          color={"primary"}
          className={"rounded-pill border-0"}
          disabled={isBusy}
          onClick={(e) => {
            handleSubmit(
              e,
              async (d) => {
                await updateOrganisationAndMuteState(organisation?._id, {
                  ...d,
                });
              },
              false
            );
          }}
        >
          {isBusy ? "Updating information..." : "Update information"}
          <MdArrowRightAlt />
        </Button>
      </div>
    </div>
  );
}

export default Configuration;
