import type { Metadata } from 'next'
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
  description: 'Local-first comic reading in the browser with CBZ-first and optional CBR support.',
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