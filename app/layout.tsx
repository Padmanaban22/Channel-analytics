import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Channel Analytics",
  description: "A focused console for your YouTube channel performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink font-sans text-cloud antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
