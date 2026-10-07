"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { motion, useScroll, useSpring } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/about/", label: "About" },
  { href: "/how-it-works/", label: "Method" },
  { href: "/detect/", label: "Detect" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 40,
    restDelta: 0.001,
  });

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const active = (href: string) => pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={clsx(
          "transition-colors duration-500",
          solid && "border-b border-hair bg-void/70 backdrop-blur-xl",
        )}
      >
        <nav className="mx-auto flex h-[68px] max-w-[1600px] items-center px-6 sm:px-10">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="display text-[22px]">Deep</span>
            <span className="display-i text-[22px] text-signal">Shield</span>
          </Link>

          <div className="ml-auto hidden items-center gap-9 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "group relative text-[13px] tracking-tight transition-colors",
                  active(l.href)
                    ? "text-bone"
                    : "text-bone-2 hover:text-bone",
                )}
              >
                {l.label}
                <span
                  className={clsx(
                    "absolute -bottom-1.5 left-0 h-px bg-signal transition-all duration-500",
                    active(l.href) ? "w-full" : "w-0 group-hover:w-full",
                  )}
                />
              </Link>
            ))}
            <Link href="/detect/" className="btn-bone !px-5 !py-2.5 !text-[12px]">
              Run analysis
            </Link>
            <ThemeToggle />
          </div>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
            >
              <span
                className={clsx(
                  "h-px w-5 bg-bone transition-transform duration-300",
                  open && "translate-y-[3.5px] rotate-45",
                )}
              />
              <span
                className={clsx(
                  "h-px w-5 bg-bone transition-transform duration-300",
                  open && "-translate-y-[3.5px] -rotate-45",
                )}
              />
            </button>
          </div>
        </nav>
      </div>

      {/* Reading progress. A one-pixel rule, not a chunky bar. */}
      <motion.div
        className="h-px origin-left bg-signal"
        style={{ scaleX: progress }}
      />

      {open && (
        <div className="border-b border-hair bg-void px-6 py-4 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block py-3 text-[15px] text-bone-2"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/detect/" className="btn-bone mt-3 w-full justify-center">
            Run analysis
          </Link>
        </div>
      )}
    </header>
  );
}
