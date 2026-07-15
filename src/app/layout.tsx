import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from '@clerk/nextjs'
import Header from "@/components/common/header";
import Footer from "@/components/common/footer";
import { syncUserToDatabase } from "@/lib/sync-user";
const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "DocuAI - AI Powered Multi-tenant Document Analysis",
  description: "Analyze and collaborate on documents with Google Gemini AI",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await syncUserToDatabase()
  return (
    <ClerkProvider>

    <html
      lang="en"
      >
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            {/* <Toaster position="top-right" richColors /> */}
          </div>
      </body>
    </html>
    </ClerkProvider>
  );
}
