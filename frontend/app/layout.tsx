import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AudioWaveform } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Providers } from "@/components/providers";
import { HealthIndicator } from "@/components/health";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dashboard | MusicAI Research Lab", template: "%s | MusicAI Research Lab" },
  description: "Local workstation for music research.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a href="#main" className="skip">Skip to content</a>
          <div className="shell">
            <aside className="sidebar">
              <div className="brand"><span className="brand-icon"><AudioWaveform size={23} aria-hidden="true" /></span>
                <div>MusicAI <small>Research Lab</small></div>
              </div>
              <Navigation />
            </aside>
            <div className="workspace">
              <header className="topbar"><span>Local workstation</span><HealthIndicator /></header>
              <main id="main" tabIndex={-1}>{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
