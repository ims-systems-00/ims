/**
 * File Handler client types (presigned upload/view/delete).
 */

export type FileMetaInfo = {
  Name: string;
  Key: string;
  key: string;
  Bucket: string;
};

export type CreateUploadUrlResult = {
  url: string;
  uploadInformation: FileMetaInfo;
  expiresInSeconds: number;
};

export type CreateViewUrlResult = {
  url: string;
  expiresInSeconds: number;
};
