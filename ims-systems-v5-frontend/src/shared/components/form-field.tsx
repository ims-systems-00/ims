import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  /** Stable Setup Guide hook, e.g. `org.fu.field.name`. */
  dataTour?: string;
};

/**
 * Label + control + optional description/error for form fields.
 */
export function FormField({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
  dataTour,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} data-tour={dataTour}>
      <label htmlFor={htmlFor} className="ims-text-label block">
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {description && !error ? (
        <p className="ims-text-meta">{description}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FormSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Stable Setup Guide hook, e.g. `org.premises.site-details`. */
  dataTour?: string;
};

export function FormSection({
  title,
  description,
  children,
  className,
  dataTour,
}: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)} data-tour={dataTour}>
      {title || description ? (
        <div className="space-y-1">
          {title ? <h3 className="ims-text-section">{title}</h3> : null}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}
