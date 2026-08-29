import classNames from "classnames";
import { LiaSpinnerSolid } from "react-icons/lia";

function CommingSoon({ align = "left" }) {
  return (
    <div
      className={classNames("my-3", {
        "text-left": align === "left",
        "text-center": align === "center",
        "text-right": align === "right",
      })}
    >
      <p>
        <LiaSpinnerSolid /> | Comming soon
      </p>
    </div>
  );
}

export default CommingSoon;
