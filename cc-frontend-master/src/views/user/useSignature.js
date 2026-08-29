import { useCallback, useEffect, useState } from "react";
import useAPIResponse from "../../hooks/apiResponse";

import { changeUserSignature } from "../../services/userService";
import {
  getSignedUrl,
  uploadFileToS3,
} from "../../services/fileHandlerService";
import { getUserWithBasicInfo } from "../../services/userService";

export const useSignature = (userId) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingSignature, setUploadingSignature] = useState({
    status: false,
    progress: 0,
  });
  const [signature, setSignature] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const { handleError, handleSuccess } = useAPIResponse();

  const changeSignature = async (file) => {
    try {
      const config = {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadingSignature({
            status: true,
            progress: percentCompleted,
          });
        },
        public: "ims-systems-public-media-files",
      };

      const { data } = await uploadFileToS3(file, config);
      setUploadingSignature({
        status: false,
        progress: 0,
      });
      const signatureResponse = await changeUserSignature(
        userId,
        data.uploadInformation
      );
      handleSuccess(signatureResponse);
    } catch (ex) {
      handleError(ex);
    }
  };
  const getSignature = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUserWithBasicInfo(userId);
      const signatureData = response.data?.user?.signatureInfo;
      console.log("signatureData", signatureData);
      if (signatureData?.key) {
        setSignature(signatureData);
      }

      if (signatureData?.key) {
        try {
          const signedUrlResponse = await getSignedUrl(signatureData);
          setSignatureUrl(signedUrlResponse.data?.url);
        } catch (urlError) {
          console.error("Error getting signed URL:", urlError);
          setSignatureUrl(null);
        }
      } else {
        setSignatureUrl(null);
      }
    } catch (error) {
      setError(error);
      setSignatureUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      getSignature();
    }
  }, [userId]);
  return {
    signature,
    signatureUrl,
    loading,
    uploadingSignature,
    error,
    changeSignature,
  };
};
