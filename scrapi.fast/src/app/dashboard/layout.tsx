import { SignedIn, UserButton } from "@clerk/nextjs";
import { ThemeSwitcherButton } from "@/components/theme-switcher-button";
import { ScrapiLongLogo } from "@/components/scrapi-long-logo";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="sticky top-0 z-50 h-header-compact w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-6">
          <ScrapiLongLogo className="h-5 w-auto" />
          <div className="flex items-center gap-3">
            <ThemeSwitcherButton />
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>
      <div className="calc-screen-header-compact flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
