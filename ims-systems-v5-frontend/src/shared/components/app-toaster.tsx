import { Toaster } from "react-hot-toast";

/**
 * Global toast host. Mount once in AppProviders.
 * Styling aligns with V5 surface / border tokens.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={10}
      toastOptions={{
        duration: 4000,
        className: "ims-toast",
        style: {
          maxWidth: "22rem",
          padding: "0.75rem 0.875rem",
          borderRadius: "0.375rem",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--foreground)",
          boxShadow: "0 8px 24px oklch(0.2 0.02 250 / 0.12)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          lineHeight: 1.4,
        },
        success: {
          iconTheme: {
            primary: "var(--success)",
            secondary: "var(--surface)",
          },
        },
        error: {
          duration: 5500,
          iconTheme: {
            primary: "var(--destructive)",
            secondary: "var(--surface)",
          },
        },
      }}
    />
  );
}
