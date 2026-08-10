'use client';

import React from 'react';
import { NhostProvider } from '@nhost/nextjs';
import { nhost } from '../lib/nhost';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-nhost-dark text-gray-100 min-h-screen font-sans">
        <NhostProvider nhost={nhost}>{children}</NhostProvider>
      </body>
    </html>
  );
}
