import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute, RoleRoute } from "@/components/ProtectedRoute";
import { TEAMS } from "@/lib/config";

import HomePage from "@/pages/HomePage";
import PropertiesPage from "@/pages/PropertiesPage";
import PropertyDetailPage from "@/pages/PropertyDetailPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ProfilePage from "@/pages/ProfilePage";
import SavedPage from "@/pages/SavedPage";
import RecentlyViewedPage from "@/pages/RecentlyViewedPage";
import OwnerDashboardPage from "@/pages/dashboard/OwnerDashboardPage";
import ListingFormPage from "@/pages/dashboard/ListingFormPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ServicesPage from "@/pages/services/ServicesPage";
import ServiceRequestPage from "@/pages/services/ServiceRequestPage";
import MyServiceRequestsPage from "@/pages/services/MyServiceRequestsPage";
import ProviderDashboardPage from "@/pages/services/ProviderDashboardPage";
import MarketplacePage from "@/pages/marketplace/MarketplacePage";
import ProductDetailPage from "@/pages/marketplace/ProductDetailPage";
import StoresPage from "@/pages/stores/StoresPage";
import StorefrontPage from "@/pages/stores/StorefrontPage";
import MyStorefrontPage from "@/pages/storefront/MyStorefrontPage";
import OrdersPage from "@/pages/OrdersPage";
import TripsPage from "@/pages/TripsPage";
import HostBookingsPage from "@/pages/HostBookingsPage";
import NotificationsPage from "@/pages/NotificationsPage";
import MessagesPage from "@/pages/MessagesPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/request" element={<ServiceRequestPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="marketplace/:id" element={<ProductDetailPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="stores/:id" element={<StorefrontPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="recently-viewed" element={<RecentlyViewedPage />} />
          <Route path="services/requests" element={<MyServiceRequestsPage />} />
          <Route path="storefront" element={<MyStorefrontPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="messages" element={<MessagesPage />} />
        </Route>

        <Route element={<RoleRoute anyOf={[TEAMS.providers]} />}>
          <Route path="provider" element={<ProviderDashboardPage />} />
        </Route>

        <Route element={<RoleRoute anyOf={[TEAMS.airbnbOwners, TEAMS.agents]} />}>
          <Route path="host/bookings" element={<HostBookingsPage />} />
        </Route>

        <Route
          element={
            <RoleRoute
              anyOf={[TEAMS.agents, TEAMS.landlords, TEAMS.airbnbOwners]}
            />
          }
        >
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="dashboard/new" element={<ListingFormPage />} />
          <Route path="dashboard/edit/:id" element={<ListingFormPage />} />
        </Route>

        <Route element={<RoleRoute anyOf={[TEAMS.admins]} />}>
          <Route path="admin" element={<AdminDashboardPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
