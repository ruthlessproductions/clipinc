import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClipProvider } from "@/context/clip-context";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClipInc — AI Video Clip Creator",
  description:
    "Turn your video podcasts into viral short-form clips. Powered by AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <ClipProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </ClipProvider>
      </body>
    </html>
  );
}
