import http from "./httpService";
import moment from "moment";
import axios from "axios";
const HTTP_FILE_HANDLER_INSTANCE = axios.create();
moment().format();
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/files`;
export async function getFileFromS3(fileKey) {
  try {
    const { data } = await http.get(`${apiEndPoint}/`, {
      headers: { "x-file-key": encodeURI(fileKey) },
      responseType: "arraybuffer",
    });
    return data;
  } catch (ex) {
    console.log("fileHandlerService", ex, ex.response);
  }
}

export async function deleteFileFromS3(fileKey) {
  try {
    await http.delete(`${apiEndPoint}/`, {
      headers: {
        "x-file-key": encodeURI(fileKey),
      },
    });
  } catch (ex) {
    console.log("fileHandlerService", ex, ex.response);
  }
}
export async function getDocumentPreview(document) {
  try {
    const { data } = await http.get(`${apiEndPoint}/document-preview`, {
      headers: {
        "x-file-key": encodeURI(document?.Key || document?.key),
        "x-file-bucket": encodeURI(document?.Bucket),
      },
      responseType: "arraybuffer",
    });
    const downloadUrl = window.URL.createObjectURL(new Blob([data]));
    return downloadUrl;
  } catch (ex) {
    console.log("fileHandlerService", ex, ex.response);
  }
}
export async function getSignedUrl(data) {
  return http.get(`${apiEndPoint}/signed-url`, {
    headers: {
      "x-file-key": encodeURI(data?.Key || data?.key),
      "x-file-bucket": encodeURI(data?.Bucket),
    },
  });
}
export async function uploadFileToS3(file, config) {
  try {
    let { data: uploadInfo } = await http.get(
      `${apiEndPoint}/signed-url/uploads`,
      {
        headers: {
          "x-file-key": encodeURI(file.name),
          "x-file-public": encodeURI(config?.public || null),
        },
      }
    );
    let uploadResponse = await HTTP_FILE_HANDLER_INSTANCE.put(
      uploadInfo.url,
      file,
      config
    );
    uploadResponse.data = { ...uploadInfo };
    return uploadResponse;
  } catch (err) {
    console.log(err);
  }
}
export async function downloadFileFromS3(attachment) {
  try {
    const fileName = attachment?.Name || attachment?.Key?.split("/").pop(); // Use pop() to get the last part of the path
    const { data } = await http.get(`${apiEndPoint}/signed-url`, {
      headers: {
        "x-file-name": encodeURI(fileName),
        "x-file-key": encodeURI(attachment?.Key || attachment?.key),
        "x-file-bucket": encodeURI(attachment?.Bucket),
      },
    });
    const response = await fetch(data.url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    link.remove();
    console.log("Download success ...", data);
  } catch (ex) {
    console.log(ex, ex.response);
  }
}
