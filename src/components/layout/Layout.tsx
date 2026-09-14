import { Outlet } from "react-router-dom";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ScrollToTop } from "./ScrollToTop";

export function Layout() {
  useIdleLogout();

  return (
    <div className="flex min-h-screen min-w-0 flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
