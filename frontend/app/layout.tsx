import './globals.css';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Karpa AI — Agentic Workspace',
  description: 'Notion style agentic workspace',
  icons: {
    icon: [
      { url: '/icon?v=2', type: 'image/svg+xml' },
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg?v=2',
    apple: '/icon.svg?v=2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
