import { useRef, useEffect, useState } from "react";
import { ImageDropZone } from "../../../components/ImageUpload";
import { Progress } from "@ims-systems-00/ims-ui-kit";

export default function Signature({
  onChange,
  hint,
  url,
  disabled = false,
  uploadProgress = 0,
}) {
  const container = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (container.current) {
      const width = container.current.getBoundingClientRect().width;
      setContainerWidth(width);
    }
  }, []);
  return (
    <div ref={container} className="w-100">
      {uploadProgress ? (
        <div className="mb-2">
          <Progress style={{ height: "5px" }} value={uploadProgress} striped />
          <small>Uploading {uploadProgress}%</small>
        </div>
      ) : null}
      {containerWidth > 0 && (
        <ImageDropZone
          width={containerWidth}
          height={200}
          onChange={onChange}
          hint={hint}
          url={url}
          disabled={disabled}
        />
      )}
    </div>
  );
}
