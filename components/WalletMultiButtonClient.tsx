'use client';

import dynamic from 'next/dynamic'; // Reinstate
import { FC } from 'react';

// Dynamically import WalletMultiButton to avoid SSR issues,
// ensuring it only executes in the browser environment.
const WalletMultiButtonDynamic = dynamic( // Reinstate
  () =>
    import('@solana/wallet-adapter-react-ui').then(
      (m) => m.WalletMultiButton
    ),
  { ssr: false }
);

const WalletMultiButtonClient: FC = () => <WalletMultiButtonDynamic />;

export default WalletMultiButtonClient; 