import type { Metadata } from 'next'
import './globals.css'
// import WalletConnectionProvider from '@/components/WalletConnectionProvider' // Old provider
import WalletProviders from '@/components/WalletProviders.client'; // New provider
import WalletMultiButtonClient from '@/components/WalletMultiButtonClient'
import { GeoVmProgramProvider } from '@/contexts/ProgramContext'

export const metadata: Metadata = {
  title: 'GeoVM Demo',
  description: 'Next.js dApp with Solana integration for GeoVM',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {/* <WalletConnectionProvider> */}
        <WalletProviders>  {/* Use new provider */}
          <GeoVmProgramProvider>
            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 999 }}>
              <WalletMultiButtonClient />
            </div>
            {children}
          </GeoVmProgramProvider>
        {/* </WalletConnectionProvider> */}
        </WalletProviders>
      </body>
    </html>
  )
}
