import { cn } from "@/shared/lib/utils";
import type { FormTheme } from "../types";
import { useThemeImageSrc } from "../lib/form-theme";

export function formLogoAlignClass(theme: FormTheme): string {
  switch (theme.logoHorizontal) {
    case "center":
      return "justify-center";
    case "right":
      return "justify-end";
    default:
      return "justify-start";
  }
}

type FormLogoProps = {
  theme: FormTheme;
  className?: string;
  imageClassName?: string;
};

export function FormLogo({
  theme,
  className,
  imageClassName = "h-10 w-auto max-w-[180px] object-contain",
}: FormLogoProps) {
  const src = useThemeImageSrc(theme.logo);
  if (!src) return null;
  return (
    <div className={cn("flex w-full", formLogoAlignClass(theme), className)}>
      <img src={src} alt="" className={imageClassName} />
    </div>
  );
}
