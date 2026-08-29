import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useState } from "react";
const variants = {
  primary: "primary",
  secondary: "secondary",
  info: "info",
  warning: "warning",
  danger: "danger",
  success: "success",
  pending: "pending",
  light: "light",
  dark: "dark",
};
export default function DataCard({
  icon,
  heading = "",
  subHeading = "",
  value = "",
  onSave = async function () {},
  variant = variants.light,
}) {
  const [hovering, setHovering] = useState(false);
  const [editParentRef] = useAutoAnimate();
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`card-single-data-${variant} bg-secondary-extra-light rounded-2 mb-2 p-3 d-flex align-items-center`}
    >
      {icon}
      <div className="ms-3 flex-grow-1">
        <p className="text-dark">{heading} </p>
        <small className="text-secondary">{subHeading}</small>
      </div>
      {/* {hovering && (
        <Button outline size="sm" className="ms-1 border-0">
          <FiEdit3 className="cursor-pointer" />
        </Button>
      )} */}
    </div>
  );
}
