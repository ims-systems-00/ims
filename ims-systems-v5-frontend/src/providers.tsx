import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppToaster } from "@/shared/components/app-toaster";
import { createQueryClient } from "@/shared/lib/query/client";
import { ThemeProvider } from "@/shared/theme";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
          <AppToaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
