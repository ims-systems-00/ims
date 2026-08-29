import classNames from "classnames";
import { Card, CardBody } from "@ims-systems-00/ims-ui-kit";
export const boxVarients = {
  secondaryExtraLight: "secondary-extra-light",
  secondaryLight: "secondary-light",
  successLight: "success-light",
  primaryLight: "primary-light",
};
export const Box = ({
  height = "auto",
  minHeight = "auto",
  maxHeight = "auto",
  width = "auto",
  minWidth = "auto",
  maxWidth = "auto",
  className,
  children,
  noShadow = false,
  varient = "",
  onClick = function () {},
}) => {
  return (
    <Card
      className={classNames("border-0 rounded-3 overflow-scroll", className, {
        "shadow-none": noShadow,
        "bg-secondary-extra-light": varient === boxVarients.secondaryExtraLight,
        "bg-secondary-light": varient === boxVarients.secondaryLight,
        "bg-success-light": varient === boxVarients.successLight,
        "bg-primary-light": varient === boxVarients.primaryLight,
      })}
      onClick={onClick}
    >
      <CardBody
        style={{ height, minHeight, maxHeight, width, minWidth, maxWidth }}
      >
        {children}
      </CardBody>
    </Card>
  );
};
