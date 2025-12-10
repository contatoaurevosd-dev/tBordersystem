import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import EditOrder from "./pages/EditOrder";
import Cash from "./pages/Cash";
import Profile from "./pages/Profile";
import PrintBridge from "./pages/PrintBridge";
import PrinterPage from "./pages/Printer";
import Clients from "./pages/Clients";
import UsersAndStores from "./pages/UsersAndStores";
import Brands from "./pages/Brands";
import Reports from "./pages/Reports";
import Stock from "./pages/Stock";
import Deliveries from "./pages/Deliveries";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner 
          position="top-center"
          toastOptions={{
            style: {
              background: 'hsl(222 47% 9%)',
              border: '1px solid hsl(222 30% 18%)',
              color: 'hsl(210 40% 98%)',
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/new" element={<NewOrder />} />
            <Route path="/orders/:id/edit" element={<EditOrder />} />
            <Route path="/cash" element={<Cash />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/print-bridge" element={<PrintBridge />} />
            <Route path="/printer" element={<PrinterPage />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/users" element={<UsersAndStores />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
