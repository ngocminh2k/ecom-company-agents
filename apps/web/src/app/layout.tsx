import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ECC OmniStudio',
  description: 'AI Agent Harness for E-Commerce — POD & Dropshipping',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
