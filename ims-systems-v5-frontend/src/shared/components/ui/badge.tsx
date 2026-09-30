import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-medium tracking-[0.01em]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        success:
          "border-transparent bg-success/12 text-success",
        warning:
          "border-transparent bg-warning/18 text-warning-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
        info: "border-transparent bg-info/12 text-info",
        muted:
          "border-transparent bg-surface-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
