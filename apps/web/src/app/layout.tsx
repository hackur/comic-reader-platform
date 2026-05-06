import type { Metadata, Viewport } from 'next'
import { Space_Grotesk } from 'next/font/google'
import type { ReactNode } from 'react'
import { AppProviders } from '@/components/AppProviders'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Comic Reader Platform',
  description:
    'Local-first comic reading in the browser with CBZ-first and optional CBR support.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.svg',
  },
  openGraph: {
    title: 'Comic Reader Platform',
    description:
      'Local-first comic reading in the browser. CBZ, CBT, PDF, image folders, and optional CBR.',
    type: 'website',
    images: [{ url: '/logo.svg', width: 64, height: 64, alt: 'Comic Reader Platform' }],
  },
  twitter: {
    card: 'summary',
    title: 'Comic Reader Platform',
    description:
      'Local-first comic reading in the browser. CBZ, CBT, PDF, image folders, and optional CBR.',
    images: ['/logo.svg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
