import { Send, MessageSquare, Share2, Users, BarChart3 } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

// SVG Components for each feature
const BroadcastSVG = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="broadcastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="broadcastBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#1e3a8a", stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: "#3730a3", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#581c87", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    {/* Background */}
    <rect width="400" height="300" fill="url(#broadcastBg)" />
    {/* Central phone/device */}
    <rect x="170" y="120" width="60" height="80" rx="8" fill="url(#broadcastGrad)" opacity="0.9" />
    <circle cx="200" cy="160" r="8" fill="white" opacity="0.8" />
    {/* Radiating messages */}
    <g opacity="0.7">
      <circle cx="100" cy="80" r="20" fill="#3b82f6" />
      <circle cx="300" cy="80" r="20" fill="#3b82f6" />
      <circle cx="80" cy="180" r="20" fill="#8b5cf6" />
      <circle cx="320" cy="180" r="20" fill="#8b5cf6" />
      <circle cx="120" cy="240" r="20" fill="#6366f1" />
      <circle cx="280" cy="240" r="20" fill="#6366f1" />
    </g>
    {/* Connection lines */}
    <g stroke="#3b82f6" strokeWidth="2" opacity="0.3">
      <line x1="200" y1="140" x2="100" y2="80" />
      <line x1="200" y1="140" x2="300" y2="80" />
      <line x1="200" y1="160" x2="80" y2="180" />
      <line x1="200" y1="160" x2="320" y2="180" />
      <line x1="200" y1="180" x2="120" y2="240" />
      <line x1="200" y1="180" x2="280" y2="240" />
    </g>
  </svg>
);

const AutomationSVG = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="autoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="autoBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#064e3b", stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: "#0e7490", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#155e75", stopOpacity: 1 }} />
      </linearGradient>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
      </marker>
    </defs>
    {/* Background */}
    <rect width="400" height="300" fill="url(#autoBg)" />
    {/* Robot head */}
    <rect x="150" y="100" width="100" height="80" rx="12" fill="url(#autoGrad)" opacity="0.9" />
    {/* Eyes */}
    <circle cx="180" cy="130" r="8" fill="white" />
    <circle cx="220" cy="130" r="8" fill="white" />
    {/* Antenna */}
    <line x1="200" y1="100" x2="200" y2="70" stroke="#10b981" strokeWidth="4" />
    <circle cx="200" cy="70" r="8" fill="#06b6d4" />
    {/* Message bubbles */}
    <g opacity="0.7">
      <rect x="280" y="120" width="80" height="40" rx="8" fill="#10b981" />
      <rect x="40" y="160" width="80" height="40" rx="8" fill="#06b6d4" />
    </g>
    {/* Automation arrows */}
    <g stroke="#10b981" strokeWidth="3" fill="none" opacity="0.5">
      <path d="M 250 140 L 280 140" markerEnd="url(#arrowhead)" />
      <path d="M 150 170 L 120 180" markerEnd="url(#arrowhead)" />
    </g>
  </svg>
);

const MultiAIAgentSVG = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#f59e0b", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#ef4444", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="aiGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#ec4899", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="aiBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#7c2d12", stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: "#4c1d95", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#831843", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    {/* Background */}
    <rect width="400" height="300" fill="url(#aiBg)" />
    {/* Central hub */}
    <circle cx="200" cy="150" r="30" fill="url(#aiGrad)" opacity="0.9" />
    <text x="200" y="158" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">AI</text>
    {/* AI Agent nodes */}
    <g opacity="0.8">
      <circle cx="100" cy="80" r="25" fill="url(#aiGrad2)" />
      <text x="100" y="86" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">A1</text>

      <circle cx="300" cy="80" r="25" fill="url(#aiGrad2)" />
      <text x="300" y="86" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">A2</text>

      <circle cx="100" cy="220" r="25" fill="url(#aiGrad2)" />
      <text x="100" y="226" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">A3</text>

      <circle cx="300" cy="220" r="25" fill="url(#aiGrad2)" />
      <text x="300" y="226" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">A4</text>
    </g>
    {/* Connection network */}
    <g stroke="#f59e0b" strokeWidth="3" opacity="0.4">
      <line x1="200" y1="150" x2="100" y2="80" />
      <line x1="200" y1="150" x2="300" y2="80" />
      <line x1="200" y1="150" x2="100" y2="220" />
      <line x1="200" y1="150" x2="300" y2="220" />
      <line x1="100" y1="80" x2="300" y2="80" strokeDasharray="5,5" />
      <line x1="100" y1="220" x2="300" y2="220" strokeDasharray="5,5" />
    </g>
    {/* Data flow particles */}
    <g fill="#f59e0b" opacity="0.6">
      <circle cx="150" cy="115" r="4" />
      <circle cx="250" cy="115" r="4" />
      <circle cx="150" cy="185" r="4" />
      <circle cx="250" cy="185" r="4" />
    </g>
  </svg>
);

const InboxSVG = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="inboxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="inboxBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#312e81", stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: "#4c1d95", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#581c87", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    {/* Background */}
    <rect width="400" height="300" fill="url(#inboxBg)" />
    {/* Chat window */}
    <rect x="80" y="50" width="240" height="200" rx="12" fill="url(#inboxGrad)" opacity="0.2" stroke="#6366f1" strokeWidth="2" />
    {/* Chat items */}
    <g opacity="0.8">
      <rect x="100" y="70" width="180" height="30" rx="6" fill="#6366f1" />
      <circle cx="115" cy="85" r="8" fill="white" />

      <rect x="100" y="110" width="180" height="30" rx="6" fill="#8b5cf6" />
      <circle cx="115" cy="125" r="8" fill="white" />

      <rect x="100" y="150" width="180" height="30" rx="6" fill="#6366f1" />
      <circle cx="115" cy="165" r="8" fill="white" />

      <rect x="100" y="190" width="180" height="30" rx="6" fill="#8b5cf6" />
      <circle cx="115" cy="205" r="8" fill="white" />
    </g>
    {/* Notification badge */}
    <circle cx="300" cy="60" r="15" fill="#ef4444" />
    <text x="300" y="66" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">3</text>
  </svg>
);

const AnalyticsSVG = () => (
  <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="analyticsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="analyticsBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#0e7490", stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: "#1e40af", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#1e3a8a", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    {/* Background */}
    <rect width="400" height="300" fill="url(#analyticsBg)" />
    {/* Chart background */}
    <rect x="60" y="60" width="280" height="180" rx="8" fill="url(#analyticsGrad)" opacity="0.1" stroke="#06b6d4" strokeWidth="2" />
    {/* Bar chart */}
    <g opacity="0.8">
      <rect x="90" y="160" width="40" height="60" rx="4" fill="#06b6d4" />
      <rect x="150" y="120" width="40" height="100" rx="4" fill="#3b82f6" />
      <rect x="210" y="140" width="40" height="80" rx="4" fill="#06b6d4" />
      <rect x="270" y="100" width="40" height="120" rx="4" fill="#3b82f6" />
    </g>
    {/* Trend line */}
    <polyline
      points="110,180 170,140 230,160 290,120"
      fill="none"
      stroke="#10b981"
      strokeWidth="3"
      opacity="0.6"
    />
    {/* Data points */}
    <g fill="#10b981" opacity="0.8">
      <circle cx="110" cy="180" r="5" />
      <circle cx="170" cy="140" r="5" />
      <circle cx="230" cy="160" r="5" />
      <circle cx="290" cy="120" r="5" />
    </g>
    {/* Percentage indicator */}
    <text x="320" y="100" fill="#10b981" fontSize="24" fontWeight="bold">↑</text>
    <text x="320" y="130" fill="#10b981" fontSize="16" fontWeight="bold">+24%</text>
  </svg>
);

const featureData = [
  {
    desc: "Kirim informasi penting ke semua pelanggan dalam sekali klik. Hemat waktu dan tenaga Anda.",
    SvgComponent: BroadcastSVG,
    title: "Kirim Pesan Massal",
    badgeTitle: "Broadcast",
    gridClass: "md:col-span-1",
    Icon: Send,
  },
  {
    desc: "Balas pesan pelanggan secara otomatis saat Anda sedang sibuk atau di luar jam kerja.",
    SvgComponent: AutomationSVG,
    title: "Balasan Otomatis",
    badgeTitle: "Automation",
    gridClass: "lg:col-span-2",
    Icon: MessageSquare,
  },
  {
    desc: "Integrasikan dengan Multi-AI Agent untuk automasi cerdas dan respons yang lebih personal.",
    SvgComponent: MultiAIAgentSVG,
    title: "Multi-AI Agent",
    badgeTitle: "AI Integration",
    gridClass: "md:col-span-1 lg:row-span-2",
    Icon: Share2,
  },
  {
    desc: "Kelola pesan masuk dari pelanggan dengan mudah dan terorganisir dalam satu tempat.",
    SvgComponent: InboxSVG,
    title: "Manajemen Chat",
    badgeTitle: "Inbox",
    gridClass: "lg:col-span-2",
    Icon: Users,
  },
  {
    desc: "Lihat performa pesan Anda dengan laporan pengiriman yang jelas dan mudah dipahami.",
    SvgComponent: AnalyticsSVG,
    title: "Laporan Pengiriman",
    badgeTitle: "Analytics",
    gridClass: "md:col-span-1",
    Icon: BarChart3,
  },
];

const Feature284 = () => {
  return (
    <section className="h-full overflow-hidden py-32">
      <div className="container mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4 md:px-10">
        <div className="grid w-full max-w-6xl grid-cols-1 grid-rows-2 gap-4 md:grid-cols-2 lg:h-[800px] lg:grid-cols-4">
          {featureData.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "relative flex flex-col gap-2 rounded-3xl border p-4",
                feature.gridClass,
              )}
            >
              <div className="flex w-full items-center justify-between">
                <p className="text-muted-foreground">{feature.badgeTitle}</p>
                <feature.Icon className="text-muted-foreground size-4" />
              </div>
              <div
                className={cn(
                  "bg-muted hidden w-full flex-1 overflow-hidden rounded-3xl md:flex",
                )}
              >
                <feature.SvgComponent />
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight flex items-center gap-2">
                <feature.Icon className="size-6 text-primary md:hidden" />
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Feature284 };
