import http from "./httpService";
import * as fileHandlerService from "./fileHandlerService";

const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/attachments`;

export async function createAttachment(
  payload = {
    moduleType: "",
    module: "",
    file: {},
  },
  config
) {
  try {
    let { data } = await fileHandlerService.uploadFileToS3(
      payload.file,
      config
    );
    return http.post(apiEndPoint, {
      module: payload.module,
      moduleType: payload.moduleType,
      fileMetaInfo: data.uploadInformation,
    });
  } catch (err) {
    console.log(err);
  }
}
export async function listAttachments({ query = "" }) {
  return http.get(apiEndPoint + "?" + query);
}
export async function getAttachment(id) {
  return http.get(apiEndPoint + `/${id}`);
}
export async function softDeleteAttachment(id) {
  return http.delete(apiEndPoint + `/${id}/soft`);
}
export async function restoreAttachment(id) {
  return http.put(apiEndPoint + `/${id}/restore`);
}

export async function hardDeleteAttachment(id) {
  return http.delete(apiEndPoint + `/${id}/hard`);
}
