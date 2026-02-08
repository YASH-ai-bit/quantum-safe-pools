import { useState, useEffect, useRef } from "react";

interface GlitchTextProps {
    text: string;
    className?: string;
    speed?: number;
    showCursor?: boolean;
    trigger?: boolean;
}

const CHARS = "01$#!@%&*<>?/";

export default function GlitchText({ text, className = "", speed = 40, showCursor = false, trigger = false }: GlitchTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const [isAnimating, setIsAnimating] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const performAnimation = () => {
        setIsAnimating(true);
        let iteration = 0;

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDisplayText(
                text
                    .split("")
                    .map((char, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        if (char === " ") return " ";
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    })
                    .join("")
            );

            if (iteration >= text.length) {
                clearInterval(intervalRef.current!);
                setIsAnimating(false);
            }

            iteration += 1 / 2;
        }, speed);
    };

    useEffect(() => {
        if (trigger) {
            performAnimation();
        } else if (!isAnimating) {
            setDisplayText(text);
        }
    }, [trigger, text]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <span
            className={`inline-block font-mono ${className}`}
            onMouseEnter={!trigger ? performAnimation : undefined}
        >
            {displayText}
            {showCursor && (
                <span className="animate-pulse ml-1 inline-block bg-primary w-[0.6em] h-[1.1em] align-middle">
                    &nbsp;
                </span>
            )}
        </span>
    );
}
