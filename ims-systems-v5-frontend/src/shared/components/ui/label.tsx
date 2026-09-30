import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type LabelProps = React.ComponentProps<"label">;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "ims-text-label mb-1.5 block peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export { Label };
