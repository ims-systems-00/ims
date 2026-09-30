import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Input, type InputProps } from "@/shared/components/ui/input";

type SearchInputProps = InputProps & {
  containerClassName?: string;
};

/**
 * Compact search field with leading icon — use in toolbars and filters.
 */
export function SearchInput({
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        className={cn("ims-field-sm pl-8", className)}
        {...props}
      />
    </div>
  );
}
