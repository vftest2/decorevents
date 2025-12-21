import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EntityProvider } from "@/contexts/EntityContext";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import AdminEntities from "./pages/AdminEntities";
import AdminEntityUsers from "./pages/AdminEntityUsers";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import Logistics from "./pages/Logistics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EntityProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminAuth />} />
            <Route path="/admin/entities" element={<AdminEntities />} />
            <Route path="/admin/entities/:entityId/users" element={<AdminEntityUsers />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </EntityProvider>
  </QueryClientProvider>
);

export default App;
