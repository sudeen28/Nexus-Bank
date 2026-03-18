import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'NexusBank — Secure Digital Banking',
  description: 'Modern, secure digital banking for everyone.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0a1f3d',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#0a1f3d' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0a1f3d' } },
          }}
        />
      </body>
    </html>
  );
}
