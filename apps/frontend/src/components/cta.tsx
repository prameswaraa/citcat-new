import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Elegant SVG Background for Waiting List Section
const WaitlistBackgroundSVG = () => (
  <svg
    viewBox="0 0 1200 600"
    className="absolute inset-0 w-full h-full"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      {/* Main elegant gradient */}
      <linearGradient id="waitlistGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#064e3b", stopOpacity: 1 }} />
        <stop offset="40%" style={{ stopColor: "#1e40af", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#581c87", stopOpacity: 1 }} />
      </linearGradient>

      {/* Accent gradients */}
      <linearGradient id="waitlistAccent1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 0.6 }} />
        <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 0.6 }} />
      </linearGradient>

      <linearGradient id="waitlistAccent2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 0.5 }} />
        <stop offset="100%" style={{ stopColor: "#ec4899", stopOpacity: 0.5 }} />
      </linearGradient>

      {/* Glow filter */}
      <filter id="waitlistGlow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Subtle blur for depth */}
      <filter id="subtleBlur">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>

    {/* Base gradient background */}
    <rect width="1200" height="600" fill="url(#waitlistGrad1)" />

    {/* Subtle grid pattern */}
    <g opacity="0.08" stroke="#10b981" strokeWidth="0.5">
      {[...Array(13)].map((_, i) => (
        <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="600" />
      ))}
      {[...Array(7)].map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 100} x2="1200" y2={i * 100} />
      ))}
    </g>

    {/* Flowing wave shapes */}
    <g opacity="0.15" filter="url(#subtleBlur)">
      <path
        d="M 0 200 Q 300 150 600 200 T 1200 200 L 1200 600 L 0 600 Z"
        fill="url(#waitlistAccent1)"
      />
      <path
        d="M 0 350 Q 400 300 800 350 T 1200 350 L 1200 600 L 0 600 Z"
        fill="url(#waitlistAccent2)"
      />
    </g>

    {/* Elegant floating orbs */}
    <g opacity="0.4" filter="url(#waitlistGlow)">
      <circle cx="150" cy="120" r="60" fill="#10b981" />
      <circle cx="1050" cy="150" r="80" fill="#3b82f6" />
      <circle cx="900" cy="450" r="70" fill="#8b5cf6" />
      <circle cx="200" cy="480" r="50" fill="#ec4899" />
    </g>

    {/* Smaller accent particles */}
    <g opacity="0.5" filter="url(#waitlistGlow)">
      <circle cx="400" cy="100" r="25" fill="#06b6d4" />
      <circle cx="750" cy="200" r="30" fill="#10b981" />
      <circle cx="300" cy="350" r="20" fill="#8b5cf6" />
      <circle cx="950" cy="320" r="28" fill="#3b82f6" />
      <circle cx="550" cy="480" r="22" fill="#ec4899" />
      <circle cx="100" cy="280" r="18" fill="#10b981" />
      <circle cx="1100" cy="420" r="24" fill="#06b6d4" />
    </g>

    {/* Subtle connecting lines */}
    <g opacity="0.12" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,5">
      <line x1="150" y1="120" x2="400" y2="100" />
      <line x1="400" y1="100" x2="750" y2="200" />
      <line x1="1050" y1="150" x2="950" y2="320" />
      <line x1="200" y1="480" x2="550" y2="480" />
    </g>

    {/* Radial highlights for depth */}
    <g opacity="0.08">
      <circle cx="600" cy="300" r="200" fill="url(#waitlistAccent1)" />
      <circle cx="300" cy="150" r="150" fill="url(#waitlistAccent2)" />
      <circle cx="900" cy="400" r="180" fill="url(#waitlistAccent1)" />
    </g>
  </svg>
);

export function CTA() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="relative w-full py-4 md:p-4">
          {/* Dotted Pattern Elements matching Hero203 */}
          <div className="-left-25 bg-muted absolute top-4 h-[1.5px] w-[105%]" />
          <div className="-left-25 bg-muted absolute bottom-4 h-[1.5px] w-[105%]" />
          <div className="-top-25 bg-muted absolute left-4 h-[120%] w-[1.5px]" />
          <div className="-top-25 bg-muted absolute right-4 h-[120%] w-[1.5px]" />
          <div className="bg-foreground absolute left-[12.5px] top-[12.5px] z-10 size-2 rounded-full" />
          <div className="bg-foreground absolute right-[12.5px] top-[12.5px] z-10 size-2 rounded-full" />
          <div className="bg-foreground absolute bottom-[12.5px] left-[12.5px] z-10 size-2 rounded-full" />
          <div className="bg-foreground absolute bottom-[12.5px] right-[12.5px] z-10 size-2 rounded-full" />

          <div className="relative flex flex-col items-center text-center gap-6 rounded-3xl border px-4 py-8 md:p-16 overflow-hidden">
            {/* Elegant SVG Background */}
            <WaitlistBackgroundSVG />

            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/30 rounded-3xl" />

            <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80">
                Coming Soon
              </div>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white">
                AI Assistant untuk Customer Service
              </h2>

              <p className="text-lg md:text-xl text-white/90 max-w-2xl">
                Tingkatkan efisiensi tim Anda dengan AI yang dapat mempelajari produk Anda dan menjawab pertanyaan pelanggan secara natural dan akurat.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-6">
                <Button size="lg" className="rounded-full px-8 h-12 text-base">
                  Join Waitlist
                </Button>
                <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  Pelajari Lebih Lanjut
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
