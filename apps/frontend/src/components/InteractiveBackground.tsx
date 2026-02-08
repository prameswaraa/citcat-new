"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export function InteractiveBackground() {
    const containerRef = useRef<HTMLDivElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const particlesRef = useRef<HTMLDivElement[]>([]);

    useEffect(() => {
        if (!containerRef.current || !emojiRef.current) return;

        const container = containerRef.current;
        const emoji = emojiRef.current;

        // Create particles
        const particleCount = 20;
        const particles: HTMLDivElement[] = [];

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement("div");
            particle.className = "absolute rounded-full pointer-events-none";

            // Random sizes and colors
            const size = Math.random() * 4 + 2;
            const colors = ["bg-primary/20", "bg-blue-500/20", "bg-purple-500/20", "bg-emerald-500/20"];
            const color = colors[Math.floor(Math.random() * colors.length)];

            particle.classList.add(color);
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;

            container.appendChild(particle);
            particles.push(particle);
            particlesRef.current.push(particle);
        }

        // Mouse move handler for parallax only
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;

            // Parallax effect on particles
            particles.forEach((particle, index) => {
                const speed = (index % 3 + 1) * 0.02; // Different speeds for depth
                const x = (clientX - window.innerWidth / 2) * speed;
                const y = (clientY - window.innerHeight / 2) * speed;

                gsap.to(particle, {
                    x,
                    y,
                    duration: 1,
                    ease: "power2.out",
                });
            });
        };

        // Magnetic effect for buttons
        const handleButtonHover = (e: MouseEvent) => {
            const button = e.currentTarget as HTMLElement;
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            gsap.to(button, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.3,
                ease: "power2.out",
            });
        };

        const handleButtonLeave = (e: MouseEvent) => {
            const button = e.currentTarget as HTMLElement;
            gsap.to(button, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: "elastic.out(1, 0.3)",
            });
        };

        // Show emoji above Sign up button
        const handleSignUpEnter = (e: MouseEvent) => {
            const button = e.currentTarget as HTMLElement;
            const rect = button.getBoundingClientRect();

            // Position emoji above button
            const x = rect.left + rect.width / 2;
            const y = rect.top - 40; // 40px above button

            gsap.set(emoji, { x, y });
            gsap.to(emoji, {
                opacity: 1,
                scale: 1,
                y: y - 10, // Bounce up a bit
                duration: 0.4,
                ease: "back.out(1.7)",
            });
        };

        const handleSignUpLeave = () => {
            gsap.to(emoji, {
                opacity: 0,
                scale: 0,
                duration: 0.2,
                ease: "power2.in",
            });
        };

        // Add magnetic effect to all buttons and sign up emoji effect
        const buttons = document.querySelectorAll("button, a[role='button']");
        buttons.forEach((button) => {
            button.addEventListener("mousemove", handleButtonHover as EventListener);
            button.addEventListener("mouseleave", handleButtonLeave as EventListener);

            // Check if it's a sign up button
            const text = button.textContent?.toLowerCase() || "";
            if (text.includes("sign up") || text.includes("daftar")) {
                button.addEventListener("mouseenter", handleSignUpEnter as EventListener);
                button.addEventListener("mouseleave", handleSignUpLeave);
            }
        });

        // Add mouse move listener
        window.addEventListener("mousemove", handleMouseMove);

        // Cleanup
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            buttons.forEach((button) => {
                button.removeEventListener("mousemove", handleButtonHover as EventListener);
                button.removeEventListener("mouseleave", handleButtonLeave as EventListener);
                button.removeEventListener("mouseenter", handleSignUpEnter as EventListener);
                button.removeEventListener("mouseleave", handleSignUpLeave);
            });
            particles.forEach((particle) => particle.remove());
            particlesRef.current = [];
        };
    }, []);

    return (
        <>
            {/* Particle container */}
            <div
                ref={containerRef}
                className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
                aria-hidden="true"
            />

            {/* Emoji cursor for Sign up button */}
            <div
                ref={emojiRef}
                className="fixed pointer-events-none z-50 text-4xl hidden md:block"
                style={{
                    transform: "translate(-50%, -50%)",
                    opacity: 0,
                    scale: 0,
                }}
                aria-hidden="true"
            >
                😊
            </div>
        </>
    );
}
