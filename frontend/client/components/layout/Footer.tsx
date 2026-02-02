import { Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t-2 border-primary bg-black mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold pixel-text text-primary mb-3">
              QUANTUM_VAULT
            </h3>
            <p className="text-foreground/70 text-sm pixel-text">
              Quantum-safe cryptocurrency wallet and liquidity pool platform.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground pixel-text mb-4">
              $ PRODUCT
            </h4>
            <ul className="space-y-2 text-sm text-foreground/70 pixel-text">
              <li>
                <a href="#" className="hover:text-primary transition">
                  wallet
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition">
                  pools
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition">
                  security
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition">
                  docs
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-foreground pixel-text mb-4">
              $ RESOURCES
            </h4>
            <ul className="space-y-2 text-sm text-foreground/70 pixel-text">
              <li>
                <a href="#" className="hover:text-primary transition">
                  blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition">
                  faq
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition">
                  support
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition">
                  community
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-foreground pixel-text mb-4">
              $ FOLLOW
            </h4>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 hover:bg-primary/20 text-foreground hover:text-primary transition border border-transparent hover:border-primary"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 hover:bg-primary/20 text-foreground hover:text-primary transition border border-transparent hover:border-primary"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="p-2 hover:bg-primary/20 text-foreground hover:text-primary transition border border-transparent hover:border-primary"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-primary pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-foreground/70 pixel-text">
              (c) 2024 QuantumVault. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-foreground/70 pixel-text">
              <a href="#" className="hover:text-primary transition">
                privacy
              </a>
              <a href="#" className="hover:text-primary transition">
                terms
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
