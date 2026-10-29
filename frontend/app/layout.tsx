import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SettingsProvider } from "@/components/SettingsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "komitty",
  description: "A place free for sharing your ideas.",
  icons: {
    icon: "/komitty-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <SettingsProvider>
            <Navbar />
            {children}
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
