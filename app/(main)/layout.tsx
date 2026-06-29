import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OverlayRouteReset from "@/components/OverlayRouteReset";
import WishlistHydrator from "@/components/WishlistHydrator";
import CartHydrator from "@/components/CartHydrator";
import ComparisonView from "@/components/ComparisonView";
import SupportButton from "@/components/SupportButton";

export const metadata: Metadata = {
  title: "BuildTech | Magazin online",
  description: "Magazin online BuildTech — componente PC, sisteme și accesorii",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <OverlayRouteReset />
      <WishlistHydrator />
      <CartHydrator />
      <Navbar />
      <main className="relative flex flex-1 flex-col">{children}</main>
      <Footer />
      <ComparisonView />
      <SupportButton />
    </div>
  );
}
