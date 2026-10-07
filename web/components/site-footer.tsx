import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hair-t">
      <div className="mx-auto max-w-[1600px] px-6 py-16 sm:px-10">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="display text-[clamp(38px,6vw,72px)]">
              Detect the <span className="display-i text-signal">fake</span>.
            </p>
            <Link href="/detect/" className="btn-bone mt-8">
              Run an analysis
              <Arrow />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
            <FooterCol
              title="Project"
              items={[
                { label: "About", href: "/about/" },
                { label: "Method", href: "/how-it-works/" },
                { label: "Detect", href: "/detect/" },
              ]}
            />
            <div>
              <p className="mono-label">Institution</p>
              <p className="mt-4 text-[13px] leading-relaxed text-bone-2">
                Department of Software Engineering
                <br />
                MUET Jamshoro
              </p>
            </div>
            <div>
              <p className="mono-label">Status</p>
              <p className="mt-4 text-[13px] leading-relaxed text-bone-2">
                Research prototype.
                <br />
                Not forensic evidence.
              </p>
            </div>
          </div>
        </div>

        <div className="mono-label mt-16 flex flex-col justify-between gap-2 border-t border-hair pt-6 sm:flex-row">
          <span>DeepShield — Final Year Project</span>
          <span>CLIP ViT-L/14 · FF++ c23 · Celeb-DF v2</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="mono-label">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="text-[13px] text-bone-2 transition-colors hover:text-bone"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
