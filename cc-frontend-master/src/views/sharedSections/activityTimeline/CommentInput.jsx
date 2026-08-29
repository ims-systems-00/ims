import React, { useEffect } from "react";
import { Button, Form } from "@ims-systems-00/ims-ui-kit";
import RichText from "../components/RichText";
import {
  getCommentFormState,
  commentFormValidaionSchema,
} from "./dto/comment.dto";
import { useForm } from "@ims-systems-00/ims-react-hooks";
const submitButtonVariants = {
  default: "default",
  footer: "footer",
};

function CommentInput({
  comment = null,
  onCreate = null,
  onUpdate = null,
  onCancel = null,
  submitButtonVariant = submitButtonVariants.default,
}) {
  const {
    dataModel,
    initiateDataModel,
    validationErrors,
    handleChange,
    handleSubmit,
    isBusy,
    isFormValid,
  } = useForm(getCommentFormState(), commentFormValidaionSchema);
  useEffect(() => {
    initiateDataModel(getCommentFormState({ comment: comment }));
  }, [comment]);
  let createButton = null;
  let updateButton = null;
  let cancelButton = null;
  if (typeof onCreate === "function")
    createButton = (
      <Button
        disabled={!isFormValid()}
        color="primary"
        size="sm"
        outline
        className="border-0 p-1"
        onClick={function (e) {
          handleSubmit(e, onCreate);
        }}
      >
        {isBusy ? "Adding..." : "Add comment"}
      </Button>
    );
  if (typeof onUpdate === "function")
    updateButton = (
      <Button
        disabled={!isFormValid()}
        color="primary"
        size="sm"
        outline
        className="border-0 p-1"
        onClick={function (e) {
          handleSubmit(e, onUpdate);
        }}
      >
        {isBusy ? "Updating..." : "Update comment"}
      </Button>
    );
  if (typeof onCancel === "function")
    cancelButton = (
      <Button
        color="danger"
        size="sm"
        outline
        className="border-0 p-1"
        onClick={onCancel}
      >
        Cancel
      </Button>
    );
  return (
    <Form>
      <RichText
        value={dataModel.comment}
        onDataStructureChange={function (value) {
          handleChange({
            field: "comment",
            value: value,
          });
        }}
        enableSubmit={submitButtonVariant === submitButtonVariants.default}
        onSubmit={function (e) {
          handleSubmit(e, onCreate);
          handleSubmit(e, onUpdate);
        }}
      />
      <div className="mt-2">
        {submitButtonVariant === submitButtonVariants.footer && createButton}
        {submitButtonVariant === submitButtonVariants.footer && updateButton}
        {cancelButton}
      </div>
    </Form>
  );
}

export default CommentInput;
