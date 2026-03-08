import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EntityProvider } from "@/contexts/EntityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/components/BrandingProvider";

// New Pages
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import RegisterPage from "./pages/RegisterPage";
import SuperAdminDashboardPage from "./pages/super-admin/DashboardPage";
import SuperAdminEntitiesPage from "./pages/super-admin/EntitiesPage";
import SuperAdminUsersPage from "./pages/super-admin/UsersPage";

// Old Pages (preserved)
import Agenda from "./pages/Agenda";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import EntityUsers from "./pages/EntityUsers";
import Logistics from "./pages/Logistics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Rentals from "./pages/Rentals";
import RentalDetails from "./pages/RentalDetails";
import Damages from "./pages/Damages";
import Contracts from "./pages/Contracts";
import EventsList from "./pages/EventsList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EntityProvider>
        <BrandingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Updated Routes using new pages */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:eventId" element={<EventDetailsPage />} />
                
                {/* Super Admin Routes */}
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
                <Route path="/super-admin/entities" element={<SuperAdminEntitiesPage />} />
                <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />

                {/* Legacy Preserved Routes */}
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/events/list" element={<EventsList />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/rentals" element={<Rentals />} />
                <Route path="/rentals/:rentalId" element={<RentalDetails />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/damages" element={<Damages />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/users" element={<EntityUsers />} />
                <Route path="/logistics" element={<Logistics />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </BrandingProvider>
      </EntityProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
