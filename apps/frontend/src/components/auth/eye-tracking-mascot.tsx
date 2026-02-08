"use client"

import { useEffect, useRef, useCallback } from "react"
import { useMascot } from "./mascot-context"

// Linear interpolation for smooth movement
function lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor
}

export function EyeTrackingMascot({ className }: { className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const leftPupilRef = useRef<SVGCircleElement>(null)
    const rightPupilRef = useRef<SVGCircleElement>(null)
    const leftHighlightRef = useRef<SVGCircleElement>(null)
    const rightHighlightRef = useRef<SVGCircleElement>(null)

    // Get mascot state from context
    let mascotState: "idle" | "email" | "password" = "idle"
    try {
        const context = useMascot()
        mascotState = context.state
    } catch {
        // Context not available, use default state
    }

    // Store current and target positions
    const mousePos = useRef({ x: 0, y: 0 })
    const currentPos = useRef({ x: 0, y: 0 })
    const animationFrameId = useRef<number | null>(null)

    const animate = useCallback(() => {
        // Lerp factor - lower = smoother but slower, higher = faster but less smooth
        const lerpFactor = 0.08

        // Smoothly interpolate current position towards mouse position
        currentPos.current.x = lerp(currentPos.current.x, mousePos.current.x, lerpFactor)
        currentPos.current.y = lerp(currentPos.current.y, mousePos.current.y, lerpFactor)

        const x = currentPos.current.x
        const y = currentPos.current.y

        // Update SVG elements directly for better performance (only when eyes are open)
        if (leftPupilRef.current) {
            leftPupilRef.current.setAttribute("cx", String(22 + x))
            leftPupilRef.current.setAttribute("cy", String(30 + y))
        }
        if (rightPupilRef.current) {
            rightPupilRef.current.setAttribute("cx", String(42 + x))
            rightPupilRef.current.setAttribute("cy", String(30 + y))
        }
        if (leftHighlightRef.current) {
            leftHighlightRef.current.setAttribute("cx", String(20 + x * 0.5))
            leftHighlightRef.current.setAttribute("cy", String(28 + y * 0.5))
        }
        if (rightHighlightRef.current) {
            rightHighlightRef.current.setAttribute("cx", String(40 + x * 0.5))
            rightHighlightRef.current.setAttribute("cy", String(28 + y * 0.5))
        }

        animationFrameId.current = requestAnimationFrame(animate)
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const containerCenterX = rect.left + rect.width / 2
            const containerCenterY = rect.top + rect.height / 2

            const deltaX = e.clientX - containerCenterX
            const deltaY = e.clientY - containerCenterY

            // Normalize and limit eye movement (max 3px movement)
            const maxMovement = 3
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
            const normalizedX = distance > 0 ? (deltaX / distance) * Math.min(distance / 50, 1) * maxMovement : 0
            const normalizedY = distance > 0 ? (deltaY / distance) * Math.min(distance / 50, 1) * maxMovement : 0

            mousePos.current = { x: normalizedX, y: normalizedY }
        }

        window.addEventListener("mousemove", handleMouseMove)
        animationFrameId.current = requestAnimationFrame(animate)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current)
            }
        }
    }, [animate])

    const isPasswordFocused = mascotState === "password"
    const isEmailFocused = mascotState === "email"

    return (
        <div ref={containerRef} className={className}>
            <svg
                width="64"
                height="64"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-lg"
                style={{ willChange: "transform" }}
            >
                {/* Background circle - chat bubble shape */}
                <circle cx="32" cy="32" r="28" className="fill-primary" />

                {/* Chat bubble tail */}
                <path
                    d="M45 50 L55 60 L50 48"
                    className="fill-primary"
                />

                {/* Left eye white */}
                <ellipse
                    cx="22"
                    cy="30"
                    rx="8"
                    ry={isPasswordFocused ? 1 : 9}
                    className="fill-white transition-all duration-300 ease-out"
                />

                {/* Right eye white */}
                <ellipse
                    cx="42"
                    cy="30"
                    rx="8"
                    ry={isPasswordFocused ? 1 : 9}
                    className="fill-white transition-all duration-300 ease-out"
                />

                {/* Left pupil - animated via ref, hidden when password focused */}
                <circle
                    ref={leftPupilRef}
                    cx="22"
                    cy="30"
                    r="4"
                    className="fill-gray-900 transition-opacity duration-300"
                    style={{ opacity: isPasswordFocused ? 0 : 1 }}
                />

                {/* Right pupil - animated via ref, hidden when password focused */}
                <circle
                    ref={rightPupilRef}
                    cx="42"
                    cy="30"
                    r="4"
                    className="fill-gray-900 transition-opacity duration-300"
                    style={{ opacity: isPasswordFocused ? 0 : 1 }}
                />

                {/* Left eye highlight */}
                <circle
                    ref={leftHighlightRef}
                    cx="20"
                    cy="28"
                    r="1.5"
                    className="fill-white transition-opacity duration-300"
                    style={{ opacity: isPasswordFocused ? 0 : 1 }}
                />

                {/* Right eye highlight */}
                <circle
                    ref={rightHighlightRef}
                    cx="40"
                    cy="28"
                    r="1.5"
                    className="fill-white transition-opacity duration-300"
                    style={{ opacity: isPasswordFocused ? 0 : 1 }}
                />

                {/* Smile - wider when email is focused */}
                <path
                    d={isEmailFocused
                        ? "M20 42 Q32 54 44 42" // Big smile
                        : isPasswordFocused
                            ? "M26 44 Q32 46 38 44" // Neutral/small mouth
                            : "M24 42 Q32 48 40 42" // Normal smile
                    }
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-300 ease-out"
                />

                {/* Blush cheeks when email focused */}
                {isEmailFocused && (
                    <>
                        <circle cx="12" cy="36" r="4" className="fill-pink-300/50" />
                        <circle cx="52" cy="36" r="4" className="fill-pink-300/50" />
                    </>
                )}
            </svg>
        </div>
    )
}
