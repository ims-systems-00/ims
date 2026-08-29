import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
function bytesToSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "n/a";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  if (i === 0) return `${bytes} ${sizes[i]})`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}
const states = { inProgress: "in-progress", staic: "static" };
export default function FileDropZone({
  onLoad = async () => {},
  hint = "Drag 'n' drop, or click to select files",
  height = 200,
  ...props
}) {
  const [loading, setLoading] = useState(states.staic);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const onDrop = React.useCallback(
    (acceptedFiles, rejectedFiles) => {
      let duplicatePaths = selectedFiles.map((file) => file.path) || [];
      acceptedFiles = acceptedFiles.filter(
        (file) => !duplicatePaths.includes(file.path)
      );
      setSelectedFiles(acceptedFiles);
    },
    [selectedFiles]
  );
  React.useEffect(() => {
    async function handleLoad() {
      setLoading(states.inProgress);
      try {
        await onLoad(selectedFiles);
      } catch (err) {
        console.log(err);
      }
      setLoading(states.staic);
    }
    handleLoad();
  }, [selectedFiles]);
  React.useEffect(() => {
    props.clearAll && setSelectedFiles([]);
  }, [props.clearAll]);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    ...(props.acceptedFileTypes && { accept: props.acceptedFileTypes }),
    multiple: props.noMultiple ? false : true,
    disabled: props.disabled,
  });
  return (
    <section>
      <div
        {...getRootProps({
          className:
            "file-dropzone " +
            (loading === states.inProgress ? "blink-element" : ""),
        })}
        style={{ height }}
      >
        <input {...getInputProps()} />
        <p className="text-primary">{hint}</p>
      </div>
    </section>
  );
}
