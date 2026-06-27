import { Inter, Source_Serif_4 } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'
import './variables.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'ECC OmniStudio',
  description: 'AI Agent Harness for E-Commerce — POD & Dropshipping',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif4.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
