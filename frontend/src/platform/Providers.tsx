import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { createConfig,http,WagmiProvider } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:20000,refetchOnWindowFocus:false},mutations:{retry:0}}});
const walletConfig=createConfig({chains:[sepolia],connectors:[injected()],transports:{[sepolia.id]:http()},ssr:true});
export function Providers({children}:{children:ReactNode}){return <WagmiProvider config={walletConfig}><QueryClientProvider client={queryClient}><MotionConfig reducedMotion="user">{children}</MotionConfig></QueryClientProvider></WagmiProvider>;}
