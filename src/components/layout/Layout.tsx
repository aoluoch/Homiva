import { Outlet } from "react-router-dom";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout() {
  useIdleLogout();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
