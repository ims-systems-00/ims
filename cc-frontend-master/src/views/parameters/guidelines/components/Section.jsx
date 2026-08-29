import React from "react";

function Section({ id, nested = false, children }) {
  return (
    <section id={id}
    >
      {children}
    </section>
  );
}

export default Section;


