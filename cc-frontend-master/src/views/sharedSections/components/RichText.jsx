import { FormGroup, TextEditor, Label } from "@ims-systems-00/ims-ui-kit";
import * as fileHandlerService from "../../../services/fileHandlerService";
import InputError from "../../../components/InputError";
export default function RichText({
  label = "",
  error = "",
  mandatorySymbol = false,
  ...props
}) {
  return (
    <FormGroup>
      {label && (
        <Label>
          {label} {mandatorySymbol && <span className="text-danger">•</span>}
        </Label>
      )}
      <TextEditor
        {...props}
        onEachFileSelection={async function (file) {
          console.log("filename", file);
          let storageInformation = null;
          try {
            let { data } = await fileHandlerService.uploadFileToS3(file, {});
            storageInformation = data.uploadInformation;
          } catch (err) {
            console.log(err);
          }
          return storageInformation;
        }}
        mediaLinkGeneratorFn={async function (storageInformation) {
          let generatedLinkToShowInUI = null;
          try {
            let { data } = await fileHandlerService.getSignedUrl(
              storageInformation
            );
            generatedLinkToShowInUI = data.url;
          } catch (err) {
            console.log(err);
          }
          return generatedLinkToShowInUI;
        }}
      />
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}
