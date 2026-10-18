import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppToaster } from "@/shared/components/app-toaster";
import { createQueryClient } from "@/shared/lib/query/client";
import { ThemeProvider } from "@/shared/theme";
import { SecurityProvider } from "@/security";

type AppProvidersProps = {
  children: React.ReactNode;
};

/**
 * App-wide providers. Auth gating lives in route layouts (`RequireAuth`),
 * so `/login` and `/register` stay public.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SecurityProvider>
            {children}
            <AppToaster />
          </SecurityProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
