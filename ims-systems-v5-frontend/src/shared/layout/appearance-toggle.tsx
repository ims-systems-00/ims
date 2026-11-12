import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useTheme } from "@/shared/theme";

/**
 * Navbar control for light / dark appearance (independent of colour presets).
 */
export function AppearanceToggle() {
  const { isDark, toggleAppearance } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={toggleAppearance}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}
