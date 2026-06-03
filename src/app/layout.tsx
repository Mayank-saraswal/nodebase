import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Provider } from "jotai";
import { SoftwareAppStructuredData, OrganizationStructuredData } from "@/components/structured-data";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nodebase.tech"),
  title: {
    default: "Nodebase — Workflow Automation Built for India",
    template: "%s | Nodebase",
  },
  description:
    "Automate your business workflows with India's most powerful automation platform. " +
    "Native support for Razorpay, Cashfree, MSG91, Shiprocket, Google Sheets, and 100+ apps. " +
    "The n8n and Zapier alternative built for Indian D2C, SaaS, and fintech companies.",
  keywords: [
    "workflow automation India",
    "n8n alternative India",
    "Zapier alternative India",
    "business automation India",
    "no-code automation India",
    "Razorpay automation",
    "Cashfree integration",
    "D2C automation India",
    "SaaS automation India",
    "nodebase",
    "workflow builder India",
    "automation platform India",
    "Shiprocket automation",
    "MSG91 automation",
    "Indian payment automation",
  ],
  authors: [{ name: "Nodebase" }],
  creator: "Nodebase",
  publisher: "Nodebase",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://nodebase.tech",
    siteName: "Nodebase",
    title: "Nodebase — Workflow Automation Built for India",
    description:
      "Automate your business workflows with India's most powerful automation platform. " +
      "Native support for Razorpay, Cashfree, MSG91, Shiprocket, and 100+ apps.",
    images: [
      {
        url: "./logos/logo.png",
        width: 1200,
        height: 630,
        alt: "Nodebase — Workflow Automation Platform for India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nodebase — Workflow Automation Built for India",
    description:
      "The n8n/Zapier alternative for Indian businesses. " +
      "Native Razorpay, Cashfree, MSG91 integrations.",
    images: ["/opengraph-image"],
    creator: "@nodebasetech",
  },
  alternates: {
    canonical: "https://nodebase.tech",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SoftwareAppStructuredData />
        <OrganizationStructuredData />
        <TRPCReactProvider>
          <NuqsAdapter>
            <Provider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </Provider>
          </NuqsAdapter>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
