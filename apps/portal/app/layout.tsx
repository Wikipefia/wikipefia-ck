import type { Metadata } from "next";
import { IBM_Plex_Serif, Noto_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SearchProvider } from "@/components/search/search-provider";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "katex/dist/katex.min.css";
import "./globals.css";

const notoSans = Noto_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
});

const plexSerif = IBM_Plex_Serif({
  weight: ["400", "500", "600"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Wikipefia — Educational Portal",
  description:
    "A statically-generated educational portal for university students. Browse subjects, read articles, and find teachers.",
};

async function getSearchMeta(): Promise<{ hash: string }> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const metaPath = path.join(
      process.cwd(),
      ".content-build",
      "search-meta.json"
    );
    const raw = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(raw);
    return { hash: meta.hash };
  } catch {
    return { hash: "dev" };
  }
}

// Inline script to prevent flash of wrong theme on page load.
// Runs before React hydrates, reads localStorage and applies .dark class immediately.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const searchMeta = await getSearchMeta();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${notoSans.variable} ${plexSerif.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <SearchProvider locale={locale} searchMeta={searchMeta}>
              {children}
            </SearchProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
