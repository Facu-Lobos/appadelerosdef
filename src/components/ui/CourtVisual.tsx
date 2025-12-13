import React from 'react';

interface CourtVisualProps {
    className?: string;
    children?: React.ReactNode;
}

export function CourtVisual({ className = '', children }: CourtVisualProps) {
    return (
        <div className={`w-full h-full bg-[#2563EB] rounded relative overflow-hidden shadow-lg border border-white/10 ${className}`}>
            {/* Turf Texture Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 to-transparent"></div>

            {/* Court Lines Container - Inset to simulate play area */}
            <div className="absolute inset-[4px] border border-white/60">
                {/* Center Net - Vertical */}
                <div className="absolute left-1/2 top-[-4px] bottom-[-4px] w-[2px] bg-gray-300 z-20 shadow-sm flex flex-col items-center justify-center -translate-x-1/2">
                    <div className="h-full w-[1px] bg-black/20"></div>
                </div>
                {/* Net Shadow */}
                <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-black/10 -translate-x-1/2 blur-[2px]"></div>

                {/* Service Lines (Vertical, approx 30% from ends) */}
                <div className="absolute left-[30%] top-0 bottom-0 w-[1px] bg-white/60"></div>
                <div className="absolute right-[30%] top-0 bottom-0 w-[1px] bg-white/60"></div>

                {/* Center Service Line (Horizontal, from Net to Service Lines) */}
                {/* Left Side */}
                <div className="absolute left-[30%] right-[50%] top-1/2 h-[1px] bg-white/60 -translate-y-1/2"></div>
                {/* Right Side */}
                <div className="absolute left-[50%] right-[30%] top-1/2 h-[1px] bg-white/60 -translate-y-1/2"></div>

                {/* Service Box T-Marks (Small details at service lines) */}
                <div className="absolute left-[30%] top-1/2 w-1 h-[1px] bg-white/60 -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute right-[30%] top-1/2 w-1 h-[1px] bg-white/60 -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Glass Walls (Back & Corners) - 3D Effect for Horizontal View */}
            <div className="absolute inset-0 border-[3px] border-white/10 rounded pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 left-0 w-[10%] bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 right-0 w-[10%] bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>

            {/* Entrance/Exit Gaps (Net level, top and bottom) */}
            <div className="absolute left-1/2 top-0 h-[4px] w-3 bg-[#0F172A] -translate-x-1/2"></div>
            <div className="absolute left-1/2 bottom-0 h-[4px] w-3 bg-[#0F172A] -translate-x-1/2"></div>

            {children}
        </div>
    );
}
