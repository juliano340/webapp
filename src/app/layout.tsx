import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const titleFont = Cormorant_Garamond({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auth Starter",
  description: "Next.js + NextAuth + Prisma + SQLite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const saved = localStorage.getItem('theme');
    const mode = saved === 'dark' || saved === 'light' ? saved : 'light';
    document.documentElement.classList.toggle('dark', mode === 'dark');
  } catch (_) {}
})();`,
          }}
        />
      </head>
      <body className={`${titleFont.variable} ${bodyFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
