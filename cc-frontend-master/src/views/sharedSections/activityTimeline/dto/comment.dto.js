import * as yup from "yup";
export const commentFormValidaionSchema = yup.object({
  comment: yup.string().label("comment"),
});
export function getCommentFormState(apiResponse) {
  return {
    comment: apiResponse?.comment || "",
  };
}
