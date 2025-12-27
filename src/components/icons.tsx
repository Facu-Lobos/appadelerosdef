import React from 'react';

export const PadelBallIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} viewBox="0 0 24 24"  style={{ transform: 'translateY(4px)' }}  >
        {/* Ball Circle: Filled with primary color, Black Stroke */}
        <circle cx="12" cy="12" r="11" fill="#00F5D4" stroke="#000000" strokeWidth="1.5" />

        {/* 'U' shape rotated 45 degrees, larger and touching the edges */}
        <path
            d="M 5 19 V 12 C 5 5 19 5 19 12 V 19"
            stroke="#0F172A" /* dark-primary bg */
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="rotate(45 12 12)"
        />
    </svg>
);


export const PadelRacketIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className || "h-8 w-8"}
        viewBox="1 0 64 64"
    >
        <g transform="scale(0.8) translate(6.4, 6.4)">
            {/* Group for stroked elements - Black Stroke for Outline */}
            <g
                stroke="#000000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* Head: Inverted teardrop shape (ping-pong style) with primary fill */}
                <path d="M32 50 C22 50 13 30 13 20 C13 10 18 6 32 6 C46 6 51 10 51 20 C51 30 42 50 32 50 Z" fill="#00F5D4" />


                {/* Heart/Bridge: no fill */}
                <path d="M24 41 l8 -8 l8 8" fill="none" />

                {/* Handle: thinner grip, connected to the head (Altura modificada de 22 a 18) */}
                <rect x="29" y="50" width="6" height="16" rx="2" fill="#00F5D4" />

                {/* Cap: (Coordenadas de path modificadas para alinearse con el nuevo grip) */}
                <path d="M27 68 Q32 73 37 68" fill="#00F5D4" />
            </g>


            {/* Holes: dark fill, arranged in a 4x4 grid */}
            <g fill="#0F172A" stroke="none">
                {/* Row 1 */}
                <circle cx="23" cy="16" r="1.5" />
                <circle cx="29" cy="16" r="1.5" />
                <circle cx="35" cy="16" r="1.5" />
                <circle cx="41" cy="16" r="1.5" />
                {/* Row 2 */}
                <circle cx="23" cy="22" r="1.5" />
                <circle cx="29" cy="22" r="1.5" />
                <circle cx="35" cy="22" r="1.5" />
                <circle cx="41" cy="22" r="1.5" />
                {/* Row 3 */}
                <circle cx="23" cy="28" r="1.5" />
                <circle cx="29" cy="28" r="1.5" />
                <circle cx="35" cy="28" r="1.5" />
                <circle cx="41" cy="28" r="1.5" />
                {/* Row 4 */}
                <circle cx="23" cy="34" r="1.5" />
                <circle cx="29" cy="34" r="1.5" />
                <circle cx="35" cy="34" r="1.5" />
                <circle cx="41" cy="34" r="1.5" />
            </g>
        </g>
    </svg>
);

export const LetterAIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className || "h-8 w-8"}
        viewBox="0 0 24 24"
    >
        {/* Futuristic 'A' Shape - Cyan fill, BLACK stroke */}
        <path
            d="M12 2L2 22h5l2.5-5h9L21 22h5L16 2H12z M12 6.5L14.5 13h-5L12 6.5z"
            fill="#00F5D4"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
    </svg>
);

