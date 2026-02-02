import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import ConnectSnapButton from "../ConnectSnapButton";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-black border-b-2 border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.svg" 
              alt="Quantum Vault Logo" 
              className="w-10 h-10 glitch-hover"
            />
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
            <ConnectSnapButton />
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
            <div className="px-2">
              <ConnectSnapButton />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
