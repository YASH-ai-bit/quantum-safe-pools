import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ArrowRight } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />

      <main className="flex-1 pt-20 pb-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-8xl font-bold pixel-text text-primary mb-4">404</h1>
            <h2 className="text-4xl font-bold pixel-text text-foreground mb-4">PAGE_NOT_FOUND</h2>
            <p className="text-lg text-foreground/70 pixel-text mb-8">
              The page you are looking for does not exist. This might be a feature we are still building!
            </p>
          </div>

          <div className="border-2 border-primary p-8 mb-8">
            <p className="text-foreground/60 text-sm mb-3 pixel-text">$ attempted_path</p>
            <p className="font-mono text-primary text-sm break-all mb-6 pixel-text">
              {location.pathname}
            </p>
            <p className="text-foreground/70 pixel-text">
              If you believe this should be a working page, please let us know! We are always improving QuantumPools.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <button className="px-8 py-4 border-2 border-primary text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-black transition-all w-full sm:w-auto pixel-text">
                BACK_HOME
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link to="/dashboard">
              <button className="px-8 py-4 border-2 border-primary text-primary hover:bg-primary hover:text-black font-bold transition-all w-full sm:w-auto pixel-text">
                DASHBOARD
              </button>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/" className="border-2 border-primary p-6 hover:bg-primary/10 transition group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition transform">HOME</div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">HOME</h3>
              <p className="text-foreground/60 text-sm pixel-text">Explore the platform</p>
            </Link>
            <Link to="/dashboard" className="border-2 border-primary p-6 hover:bg-primary/10 transition group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition transform">WALLET</div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">DASHBOARD</h3>
              <p className="text-foreground/60 text-sm pixel-text">Manage your wallet</p>
            </Link>
            <Link to="/pools" className="border-2 border-primary p-6 hover:bg-primary/10 transition group">
              <div className="text-3xl mb-3 group-hover:scale-110 transition transform">POOLS</div>
              <h3 className="font-bold mb-2 pixel-text text-foreground">POOLS</h3>
              <p className="text-foreground/60 text-sm pixel-text">Explore liquidity pools</p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
