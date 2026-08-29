import React from "react";

function Heading({ level = 2, id, children }) {
  const Tag = `h${Math.min(Math.max(level, 1), 6)}`;

  return (
    <Tag className="mb-3"
      id={id}
    >
      {children}
    </Tag>
  );
}

export default Heading;
