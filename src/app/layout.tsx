import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { BootSplash } from "@/components/app/boot-splash";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "wdth"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Delegação EP — Engenharia UFRGS",
    template: "%s · Delegação EP",
  },
  description:
    "Gestão da delegação e torcida da Engenharia UFRGS no Engenheiradas (EP): agenda, atletas, torcida e operação dos 3 dias.",
  applicationName: "Delegação EP",
  keywords: ["AAEE", "Engenharia UFRGS", "EP", "Engenheiradas", "delegação", "torcida"],
  authors: [{ name: "AAEE Engenharia UFRGS" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Delegação EP",
    title: "Delegação EP — Engenharia UFRGS",
    description:
      "Agenda, torcida e operação dos 3 dias do EP num só painel.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Delegação EP — Engenharia UFRGS",
    description: "Agenda, torcida e operação dos 3 dias do EP num só painel.",
  },
  appleWebApp: {
    capable: true,
    title: "Delegação EP",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDE5D0" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1F33" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${bricolage.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20">
        <BootSplash />
        <ThemeProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
