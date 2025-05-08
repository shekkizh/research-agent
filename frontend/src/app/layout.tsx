import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Research Assistant',
  description: 'AI-powered research assistant application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
} 