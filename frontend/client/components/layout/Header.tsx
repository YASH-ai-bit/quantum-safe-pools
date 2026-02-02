import { Link } from "react-router-dom";
import { Menu, X, Wallet } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-black border-b-2 border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="relative bg-black border-2 border-primary p-2 glitch-hover">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
            </div>
            <span className="text-xl font-bold pixel-text hidden sm:inline text-primary">
              QUANTUM_VAULT
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground hover:text-primary transition pixel-text text-sm">
              $ home
            </Link>
            <Link to="/dashboard" className="text-foreground hover:text-primary transition pixel-text text-sm">
              $ dashboard
            </Link>
            <Link to="/pools" className="text-foreground hover:text-primary transition pixel-text text-sm">
              $ pools
            </Link>
            <Link to="/create-pool" className="text-foreground hover:text-primary transition pixel-text text-sm">
              $ create
            </Link>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <button className="px-6 py-2 border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-black transition-all duration-300 pixel-text text-sm">
              [CONNECT_WALLET]
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition"
          >
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden pb-4 space-y-2 border-t-2 border-primary pt-4">
            <Link
              to="/"
              className="block px-4 py-2 text-foreground hover:text-primary transition hover:bg-primary/20 border border-primary pixel-text text-sm"
            >
              $ home
            </Link>
            <Link
              to="/dashboard"
              className="block px-4 py-2 text-foreground hover:text-primary transition hover:bg-primary/20 border border-primary pixel-text text-sm"
            >
              $ dashboard
            </Link>
            <Link
              to="/pools"
              className="block px-4 py-2 text-foreground hover:text-primary transition hover:bg-primary/20 border border-primary pixel-text text-sm"
            >
              $ pools
            </Link>
            <Link
              to="/create-pool"
              className="block px-4 py-2 text-foreground hover:text-primary transition hover:bg-primary/20 border border-primary pixel-text text-sm"
            >
              $ create
            </Link>
            <button className="w-full px-4 py-2 border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-black transition-all pixel-text">
              [CONNECT_WALLET]
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
