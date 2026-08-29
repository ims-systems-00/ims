import React from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
} from "@ims-systems-00/ims-ui-kit";
import SelectInput from "../../components/SelectInput";
import TextInput from "../../components/TextInput";
import { useForm } from "@ims-systems-00/ims-react-hooks";
import * as yup from "yup";
import { useCreateSupportRequest } from "./hooks/useCreateSupportRequest";
const defaultDataModel = {
  summary: "",
  type: {
    value: "Question",
    label: "Question",
  },
  description: "",
};
const supportFormValidationSchema = yup.object().shape({
  summary: yup.string().required("Summary is required"),
  type: yup.object().shape({
    value: yup.string().required("Type is required"),
    label: yup.string().required("Type is required"),
  }),
  description: yup.string().required("Description is required"),
});
function Support() {
  const { dataModel, validationErrors, handleChange, handleSubmit, isBusy } =
    useForm(defaultDataModel, supportFormValidationSchema);
  const { createSupportRequest } = useCreateSupportRequest();
  return (
    <Container>
      <Row>
        <Col md="5" className="mx-auto my-5">
          <Card className="rounded-3 border-0 shadow-sm">
            <CardBody>
              <h5>Get Support</h5>
              <p>
                One of our support agents will get back to you as soon as
                possible.
              </p>
              <hr></hr>
              <TextInput
                label="Subject Line"
                mandatorySymbol
                placeholder="e.g., How do I calculate my emissions?"
                value={dataModel.summary}
                error={validationErrors.summary}
                onChange={(changes) =>
                  handleChange({
                    field: "summary",
                    value: changes.currentTarget.value,
                  })
                }
              />
              <SelectInput
                label="Request Type"
                options={[
                  {
                    value: "Bug",
                    label: "Bug",
                  },
                  {
                    value: "Feature Request",
                    label: "Feature Request",
                  },
                  {
                    value: "Enhancement",
                    label: "Enhancement",
                  },
                  {
                    value: "Question",
                    label: "Question",
                  },
                ]}
                mandatorySymbol
                value={dataModel.type}
                error={validationErrors["type.value"]}
                onChange={(changes) =>
                  handleChange({
                    field: "organisationalBoundary",
                    value: changes,
                  })
                }
              />
              <TextInput
                label="Describe Your Issue"
                type="textarea"
                rows={15}
                mandatorySymbol
                placeholder="e.g., I am unable to calculate my emissions."
                value={dataModel.description}
                error={validationErrors.description}
                onChange={(changes) =>
                  handleChange({
                    field: "description",
                    value: changes.currentTarget.value,
                  })
                }
              />
              <Button
                color="primary"
                onClick={(e) =>
                  handleSubmit(e, (data) =>
                    createSupportRequest({
                      ...data,
                      summary:
                        `Carbo-Calc Support [${data.type.value}]: ` +
                        data.summary,
                      type: data.type.value,
                    })
                  )
                }
                disabled={isBusy}
              >
                Submit
              </Button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Support;
