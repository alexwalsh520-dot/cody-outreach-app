import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Scout — Lead Engine',
  description: 'Autonomous fitness influencer lead generation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0c0c10] text-white h-screen flex flex-col overflow-hidden antialiased">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[#0c0c10]">
            <div className="max-w-[1360px] mx-auto px-8 py-7">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
