import React from 'react';

export const PadelRacket = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M6 12h12" />
        <path d="M6 12a6 6 0 1 1 12 0v-1" />
        <path d="M12 21v-3" />
        <path d="M12 18a6 6 0 0 0 6-6V7a6 6 0 0 0-12 0v5a6 6 0 0 0 6 6Z" />
        <path d="M10 15h4" />
        <path d="M12 12v3" />
    </svg>
);

export const PadelBall = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
    </svg>
);
