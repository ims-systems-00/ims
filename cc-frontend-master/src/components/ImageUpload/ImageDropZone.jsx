import React, { useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import { useDropzone } from "react-dropzone";
import { CiCamera } from "react-icons/ci";
import ImageEditor from "./ImageEditor";
import { readFileAsDataUrl } from "../../utils/readFile";
import DragNDropImg from "../../assets/image/dragAndDropImage.svg";

const ImageDropZone = ({
  hint = "+",
  url,
  onChange = () => {},
  disabled = false,
  position = "center",
  width = 100,
  height = 100,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageSrc, setImageSrc] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const imageDataUrl = await readFileAsDataUrl(file);

    setImageSrc(imageDataUrl);
    setSelectedFile(file);
    setIsEditing(true);
  }, []);

  useEffect(() => {
    if (url) setImageSrc(url);
  }, [url]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    disabled,
    accept: "image/jpeg,image/png,image/gif",
  });

  const handleCropConfirm = (image) => {
    if (!selectedFile) return;

    const updatedFile = new File([image.blob], selectedFile.name, {
      type: selectedFile.type,
      lastModified: selectedFile.lastModified,
    });

    setImageSrc(image.url);
    onChange({ ...image, file: updatedFile });
    setIsEditing(false);
  };

  const handleCropCancel = () => {
    setIsEditing(false);
  };

  return (
    <section
      className={classNames("", {
        "mx-auto": position === "center",
        "mx-0": position === "left",
        "ms-auto": position === "right",
      })}
    >
      {isEditing ? (
        <ImageEditor
          photoUrl={imageSrc}
          onCropConfirm={handleCropConfirm}
          onCropCancel={handleCropCancel}
          position={position}
          height={Number(height)}
          width={Number(width)}
        />
      ) : (
        <div
          {...getRootProps({
            className: classNames("image-dropzone mb-2", {
              "mx-auto": position === "center",
              "image-pre-populated": imageSrc !== "",
            }),
            style: { width, height },
          })}
        >
          <input {...getInputProps()} />

          <div className="text-center">
            {imageSrc ? (
              <img width="100%" src={imageSrc} alt="Selected" />
            ) : (
              <>
                <img className="w-65" src={DragNDropImg} alt="Placeholder" />
                <p className="text-primary mt-0">
                  <b>{hint}</b>
                </p>
              </>
            )}
            <span
              className="position-absolute bottom-2 right-2 bg-secondary-extra-light p-1 text-center rounded-circle"
              role="button"
            >
              <CiCamera size={18} className="text-dark" />
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default ImageDropZone;
