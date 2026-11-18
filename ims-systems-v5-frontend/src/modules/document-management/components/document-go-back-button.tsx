import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type DocumentGoBackButtonProps = {
  className?: string;
  /** Fallback path when history cannot go back. Default: Documents. */
  fallbackTo?: string;
};

/**
 * Shared DM back control — one browser-history step.
 * Folder browsing keeps `?folder=` in the URL so this returns to the
 * previous folder, not the repositories list.
 */
export function DocumentGoBackButton({
  className,
  fallbackTo = "/documents",
}: DocumentGoBackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("shrink-0", className)}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          navigate(-1);
          return;
        }
        navigate(fallbackTo);
      }}
    >
      <ArrowLeft className="size-3.5" />
      Go back
    </Button>
  );
}
