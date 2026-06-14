import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import OverlayRouteReset from "@/components/OverlayRouteReset";
import WishlistHydrator from "@/components/WishlistHydrator";
import CartHydrator from "@/components/CartHydrator";
import ComparisonView from "@/components/ComparisonView";

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
    </div>
  );
}
