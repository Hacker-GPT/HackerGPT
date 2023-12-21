import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { HomeProvider } from '@/pages/api/home/home.context';

import '@/styles/globals.css';
import { PremiumStatusProvider } from '@/hooks/PremiumStatusContext';

const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  const queryClient = new QueryClient();

  return (
    <div className={inter.className}>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <HomeProvider>
          <PremiumStatusProvider>
            <Component {...pageProps} />
          </PremiumStatusProvider>
        </HomeProvider>
        <Analytics />
      </QueryClientProvider>
    </div>
  );
}

export default appWithTranslation(App);
