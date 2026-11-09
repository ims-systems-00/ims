import type { ReactNode } from "react";
import { ImageUploadControl } from "@/modules/files/components/image-upload-control";
import {
  attrString,
  type ElementAttributes,
} from "./element-types";

export type ElementImagePosition = "above" | "below" | "background";

export function attrImagePosition(
  attributes: ElementAttributes
): ElementImagePosition {
  const value = attrString(attributes, "imagePosition", "above");
  if (value === "below" || value === "background") return value;
  return "above";
}

export function ElementImagePreview({
  attributes,
  className,
}: {
  attributes: ElementAttributes;
  className?: string;
}) {
  const src = attrString(attributes, "imageSrc");
  if (!src) return null;
  const position = attrImagePosition(attributes);
  if (position === "background") {
    return (
      <div
        className={className ?? "relative overflow-hidden rounded-md"}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: 96,
        }}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={
        className ?? "max-h-40 w-full rounded-md object-cover"
      }
    />
  );
}

export function ElementImageProperties({
  attributes,
  onChange,
}: {
  attributes: ElementAttributes;
  onChange: (next: ElementAttributes) => void;
}) {
  const src = attrString(attributes, "imageSrc");
  const position = attrImagePosition(attributes);

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm font-medium">Image</p>
      <ImageUploadControl
        imageUrl={src || null}
        alt="Element image"
        shape="rounded"
        tileClassName="h-20 w-full max-w-xs text-sm"
        uploadPath="forms"
        uploadLabel="Upload image"
        changeLabel="Change image"
        onUploaded={(meta, viewUrl) => {
          onChange({
            ...attributes,
            imageSrc: viewUrl,
            imageStorage: {
              bucket: meta.Bucket,
              key: meta.Key,
              fileName: meta.Name,
            },
          });
        }}
        onRemove={() => {
          onChange({
            ...attributes,
            imageSrc: "",
            imageStorage: null,
          });
        }}
      />
      <label className="block text-sm">
        Position
        <select
          className="mt-1 w-full rounded-md border border-border px-2 py-1.5 text-sm"
          value={position}
          onChange={(e) =>
            onChange({
              ...attributes,
              imagePosition: e.target.value as ElementImagePosition,
            })
          }
        >
          <option value="above">Above content</option>
          <option value="below">Below content</option>
          <option value="background">Background</option>
        </select>
      </label>
    </div>
  );
}

export function withElementImage(
  attributes: ElementAttributes,
  content: ReactNode
): ReactNode {
  const src = attrString(attributes, "imageSrc");
  if (!src) return content;
  const position = attrImagePosition(attributes);

  if (position === "background") {
    return (
      <div className="relative overflow-hidden rounded-md">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 p-3">{content}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {position === "above" ? <ElementImagePreview attributes={attributes} /> : null}
      {content}
      {position === "below" ? <ElementImagePreview attributes={attributes} /> : null}
    </div>
  );
}
