import React from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
function Figure({ src, alt, caption }) {
  return (
    <div className="text-center mx-3 rounded-3">
      <div className="w-100 rouded-3 shadow-sm overflow-hidden">
        {/* <img src={src} alt={alt} className="rouded-3 overflow-hidden" /> */}
        <LazyLoadImage
          alt={alt}
          src={src}
        />
      </div>
      {caption && <p className="fs-6 fst-italic mt-2">{caption}</p>}
    </div>
  );
}

export default Figure;
