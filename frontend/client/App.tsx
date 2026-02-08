import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { wagmiConfig } from "@/lib/wagmi";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Pools from "./pages/Pools";
import CreatePool from "./pages/CreatePool";
import PoolDetail from "./pages/PoolDetail";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";

import Wallet from "./pages/Wallet";

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pools" element={<Pools />} />
              <Route path="/pool/:poolId" element={<PoolDetail />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/create-pool" element={<CreatePool />} />
              <Route path="/faq" element={<FAQ />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
