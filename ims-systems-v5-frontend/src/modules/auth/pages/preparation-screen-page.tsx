import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Post–Stripe Checkout / post-auth landing (V4 `/auth/preparation-screen`).
 * Lands on the Live Dashboard (/) once the session is ready.
 */
export function PreparationScreenPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-foreground">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <h1 className="text-sm font-semibold tracking-tight">
        Finishing setup…
      </h1>
      <p className="max-w-sm text-center text-[0.8125rem] text-muted-foreground">
        Returning you to your dashboard. If billing just completed, your
        subscription status updates when Stripe confirms the payment.
      </p>
    </div>
  );
}
