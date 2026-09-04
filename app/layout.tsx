import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Himalaya Udhyog — Factory Production & Inventory OS",
  description: "End-to-end footwear factory management: worker tracking, cross-department workflows, material costing, and inventory control.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-base text-ink antialiased selection:bg-accent/20 selection:text-ink">
        <Navbar />
        <main className="min-h-[calc(100vh-52px)] max-w-7xl mx-auto px-4 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
