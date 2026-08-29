import React, { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@ims-systems-00/ims-ui-kit";
import classNames from "classnames";
import { getCroppedImg } from "../../utils/canvas";

const ImageEditor = ({
  photoUrl = "https://plus.unsplash.com/premium_photo-1683880731020-83b984105a72?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=384&q=80",
  onCropConfirm = () => {},
  onCropCancel = () => {},
  position = "center",
  height = 300,
  width = 300,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const confirmCrop = useCallback(async () => {
    if (!croppedAreaPixels || !photoUrl) return;

    try {
      const croppedImage = await getCroppedImg(
        photoUrl,
        croppedAreaPixels,
        rotation
      );
      if (croppedImage) {
        onCropConfirm(croppedImage);
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  }, [croppedAreaPixels, photoUrl, rotation, onCropConfirm]);

  return (
    <div>
      <div
        className={classNames("image-editor mb-2", {
          "mx-auto": position === "center",
        })}
        style={{
          width: width,
          height: height,
        }}
      >
        <Cropper
          image={photoUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={width / height}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={handleCropComplete}
        />
      </div>
      <div
        className={classNames("d-flex justify-content-center gap-2", {
          "mx-auto": position === "center",
        })}
      >
        <Button size="sm" color="success" onClick={confirmCrop}>
          Confirm
        </Button>
        <Button size="sm" color="danger" onClick={onCropCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ImageEditor;
