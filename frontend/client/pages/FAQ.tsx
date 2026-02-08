import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Shield, Lock, Zap, BarChart3, HelpCircle } from "lucide-react";

export default function FAQ() {
    const faqs = [
        {
            question: "WHAT IS A QUANTUM-SAFE WALLET?",
            answer: "A quantum-safe wallet (like QuantumPools) uses Post-Quantum Cryptography (PQC) algorithms that are resistant to attacks from both classical and future quantum computers. Traditional wallets use ECDSA, which could be broken by Shor's algorithm on a sufficiently powerful quantum computer.",
            icon: <Shield className="w-6 h-6 text-primary" />,
        },
        {
            question: "HOW DOES THE SECURITY WORK?",
            answer: "We utilize NIST-approved quantum-resistant algorithms (like CRYSTALS-Kyber and Dilithium) integrated via a dedicated MetaMask Snap. This layer handles the quantum-safe signing process while maintaining compatibility with the Ethereum ecosystem.",
            icon: <Lock className="w-6 h-6 text-primary" />,
        },
        {
            question: "WHAT ARE QUANTUM-SAFE LIQUIDITY POOLS?",
            answer: "These are specialized Uniswap V4 based pools where all liquidity management and swap operations require a valid quantum-resistant signature. This ensures that even if a quantum computer could forge traditional signatures, your pooled assets remain protected.",
            icon: <Zap className="w-6 h-6 text-primary" />,
        },
        {
            question: "IS MY CURRENT METAMASK ACCOUNT VULNERABLE?",
            answer: "Currently, quantum computers capable of breaking ECDSA do not exist. However, the 'Harvest Now, Decrypt Later' threat is real. QuantumPools allows you to migrate to a quantum-secure architecture today to future-proof your assets.",
            icon: <HelpCircle className="w-6 h-6 text-primary" />,
        },
        {
            question: "HOW DO I START USING QUANTUMPOOLS?",
            answer: "1. Install our MetaMask Snap. 2. Create a Quantum Account through the dashboard. 3. Deposit funds into your new quantum-safe address. 4. Start swapping or providing liquidity in quantum-safe pools.",
            icon: <BarChart3 className="w-6 h-6 text-primary" />,
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-black">
            <Header />

            <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl lg:text-6xl font-bold mb-6 pixel-text text-foreground">
                            <span className="text-primary">FREQUENTLY</span>
                            <br />
                            ASKED_QUESTIONS
                        </h1>
                        <p className="text-lg text-foreground/70 pixel-text">
                            Everything you need to know about the future of quantum-resistant DeFi.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="border-2 border-primary p-8 bg-black hover:bg-primary/5 transition-all duration-300 group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 border border-primary/30 text-primary group-hover:border-primary transition-colors">
                                        {faq.icon}
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold pixel-text text-primary group-hover:text-foreground transition-colors uppercase">
                                            {">"} {faq.question}
                                        </h3>
                                        <p className="text-foreground/80 leading-relaxed pixel-text text-sm">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Technical Note */}
                    <div className="mt-16 p-8 border-2 border-primary/30 bg-primary/5 text-center">
                        <h4 className="text-primary font-bold pixel-text mb-4 uppercase">Technical_Note</h4>
                        <p className="text-foreground/70 text-sm pixel-text leading-relaxed">
                            Our platform implements EIP-4337 (Account Abstraction) to enable quantum-safe signature verification
                            without requiring changes to the underlying Ethereum protocol. All transactions are processed
                            through quantum-enabled bundlers and paymasters.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
