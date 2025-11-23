import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/providers/posthog";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "scrapi.fast - Turn websites into deterministic APIs",
  description:
    "Convierte páginas web en APIs deterministas. Transform any website into a reliable, structured API endpoint with scrapi.fast.",
  keywords: [
    "API",
    "web scraping",
    "automation",
    "developer tools",
    "scraping",
    "data extraction",
  ],
  authors: [{ name: "scrapi.fast team" }],
  openGraph: {
    title: "scrapi.fast - Turn websites into deterministic APIs",
    description: "Convierte páginas web en APIs deterministas",
    type: "website",
    locale: "en_US",
    siteName: "scrapi.fast",
  },
  twitter: {
    card: "summary_large_image",
    title: "scrapi.fast - Turn websites into deterministic APIs",
    description: "Convierte páginas web en APIs deterministas",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        >
          <PostHogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
            <Analytics />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
