import clsx from "clsx";
import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mono-label flex items-center gap-3">
      <span className="h-px w-8 bg-signal" />
      {children}
    </div>
  );
}

export function PageHeader({
  label,
  title,
  lede,
}: {
  label: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <header className="rise">
      <SectionLabel>{label}</SectionLabel>
      <h1 className="display mt-8 max-w-4xl text-balance text-[clamp(38px,6.5vw,96px)]">
        {title}
      </h1>
      {lede && (
        <p className="mt-8 max-w-2xl text-pretty text-[15px] leading-[1.8] text-bone-2 sm:text-[17px]">
          {lede}
        </p>
      )}
    </header>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("panel", className)}>
      {title && (
        <header className="border-b border-hair px-5 py-4 sm:px-6">
          <h3 className="text-[14px] tracking-tight">{title}</h3>
        </header>
      )}
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 text-[14.5px] leading-[1.8] text-bone-2 [&_b]:font-medium [&_b]:text-bone [&_strong]:font-medium [&_strong]:text-bone">
      {children}
    </div>
  );
}

export function Callout({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "info";
  children: ReactNode;
}) {
  const warn = tone === "warn";
  return (
    <div
      className={clsx(
        "flex gap-3 rounded px-4 py-3.5 text-[13.5px] leading-relaxed",
        warn
          ? "border border-warn/25 bg-warn/[0.07] text-bone-2"
          : "border border-hair bg-raise text-bone-2",
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={warn ? "var(--color-warn)" : "var(--color-signal)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        {warn ? (
          <>
            <path d="M12 9v4.5" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9L2.4 17.5a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </>
        )}
      </svg>
      <div>{children}</div>
    </div>
  );
}
