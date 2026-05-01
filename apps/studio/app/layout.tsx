import type { Metadata } from "next";
import { IBM_Plex_Serif, JetBrains_Mono, Noto_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ConvexClientProvider } from "@/components/shared/convex-provider";
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

const jetbrains = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin", "cyrillic"],
  variable: "--font-editor",
});

export const metadata: Metadata = {
  title: "Wikipefia Studio — MDX Editor",
  description: "Live MDX editor with real-time preview for Wikipefia content",
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${notoSans.variable} ${plexSerif.variable} ${jetbrains.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
