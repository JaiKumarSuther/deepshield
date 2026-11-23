import { DetectToolHeader } from "@/components/detect-tool-header";

/**
 * Shared shell for /detect/video/ and /detect/audio/. Keeping the header
 * and switch in a layout means they persist across the two routes, so
 * the switch's pill can slide rather than remount.
 */
export default function DetectToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-24 pt-[132px] sm:px-10">
      <DetectToolHeader />
      {children}
    </div>
  );
}
