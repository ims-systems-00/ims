import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import imsLogo from "@/assets/images/ims-logo.svg";
import { AuthShowcaseSlider } from "./auth-showcase-slider";

type AuthEntryLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * Split auth chrome — form on the left, product showcase slider on the right.
 */
export function AuthEntryLayout({
  title,
  description,
  children,
}: AuthEntryLayoutProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh w-full max-w-[1400px] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <section className="flex flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <Link
            to="/login"
            className="inline-flex w-fit items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <img
              src={imsLogo}
              alt="iMS Systems"
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex flex-1 flex-col justify-center py-10 lg:py-12">
            <div className="mx-auto w-full max-w-[24rem] space-y-8">
              <div className="space-y-2.5">
                <h1 className="text-[1.875rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2rem]">
                  {title}
                </h1>
                <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="space-y-6">{children}</div>
            </div>
          </div>

          <p className="mt-auto max-w-[24rem] text-[0.75rem] leading-relaxed text-muted-foreground">
            By continuing you agree to use iMS Systems in line with your
            organisation&apos;s policies and applicable agreements.
          </p>
        </section>

        <aside className="hidden p-4 lg:block lg:p-6 xl:p-8" aria-label="Product preview">
          <AuthShowcaseSlider />
        </aside>
      </div>
    </div>
  );
}
