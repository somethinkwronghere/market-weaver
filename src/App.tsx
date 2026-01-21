import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IndicatorProvider } from "./contexts/IndicatorContext";
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <IndicatorProvider>
        <Index />
        <Toaster />
        <Sonner />
      </IndicatorProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
