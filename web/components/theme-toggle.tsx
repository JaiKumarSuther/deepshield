"use client";

import { useEffect, useState } from "react";

/**
 * Theme is read/written outside React (see the inline script in
 * layout.tsx) so the very first paint is already correct — this
 * component only needs to reflect and flip the `data-theme` attribute
 * that script already set.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    setTheme(
      (document.documentElement.getAttribute("data-theme") as
        | "dark"
        | "light"
        | null) ?? "dark",
    );
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className={className ?? "flex h-9 w-9 items-center justify-center rounded-full text-bone-2 transition-colors hover:text-bone"}
    >
      {/* Both icons are always in the DOM (avoids a hydration flash);
          only their opacity/rotation is toggled once theme is known. */}
      <span className="relative block h-[15px] w-[15px]">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="absolute inset-0 transition-all duration-300"
          style={{
            opacity: theme === "light" ? 1 : 0,
            transform: theme === "light" ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.6)",
          }}
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
        </svg>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="absolute inset-0 transition-all duration-300"
          style={{
            opacity: theme === "light" ? 0 : 1,
            transform: theme === "light" ? "rotate(90deg) scale(0.6)" : "rotate(0deg) scale(1)",
          }}
        >
          <path d="M20.5 14.2A8.5 8.5 0 1110 3.3a6.8 6.8 0 0010.5 10.9z" />
        </svg>
      </span>
    </button>
  );
}
