import type { CalendarEventColor } from "../types";

/** Map backend event.color to design-system semantic classes. */
export const eventColorClass: Record<CalendarEventColor, string> = {
  default:
    "border-border bg-muted text-muted-foreground hover:bg-muted/80",
  orange:
    "border-warning/40 bg-warning/15 text-warning-foreground hover:bg-warning/25",
  green:
    "border-success/40 bg-success/15 text-success-foreground hover:bg-success/25",
  red: "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
  azure: "border-info/40 bg-info/15 text-info hover:bg-info/25",
  purple:
    "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15",
};

export const eventColorDotClass: Record<CalendarEventColor, string> = {
  default: "bg-muted-foreground",
  orange: "bg-warning",
  green: "bg-success",
  red: "bg-destructive",
  azure: "bg-info",
  purple: "bg-primary",
};
