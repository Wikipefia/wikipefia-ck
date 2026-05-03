import type { Metadata } from "next";
import { IBM_Plex_Serif, Noto_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ChatProvider } from "@/components/ChatProvider";
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

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-editor",
});

export const metadata: Metadata = {
  title: "Wikipefia Chat",
  description:
    "AI tutor for university students — chat with rich interactive widgets",
};

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${notoSans.variable} ${plexSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ChatProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </ChatProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
