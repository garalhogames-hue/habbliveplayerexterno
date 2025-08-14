import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Rádio Habblive — Player",
  description: "Rádio Habblive - Estamos a 10 anos com você! Fique Sintonizado =)",
  icons: {
    icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/33c5a23f-60c0-4265-a252-981bc7f54bbd-DjLxQjDMn7qMeDhGh0w3Uh89TTnxvI.png",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br" className={`${inter.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
