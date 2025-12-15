import React from 'react';
import { PadelBallIcon, PadelRacketIcon } from './icons';
import clsx from 'clsx';

interface AppLogoProps {
    className?: string;
    variant?: 'default' | 'small';
}

export const AppLogo: React.FC<AppLogoProps> = ({ className, variant = 'default' }) => {
    const isSmall = variant === 'small';

    const textStyle = {
        fontFamily: "'Poppins', sans-serif",
        color: '#000000',
        fontWeight: '900',
        WebkitTextStroke: '4px #ffffff',
        paintOrder: 'stroke fill',
        WebkitPaintOrder: 'stroke fill',
    };

    // Base styling from Login.tsx (using exact pixels)
    // We wrap it in a container that handles scaling
    return (
        <div className={clsx("flex items-center justify-center select-none", className)}>
            <div className={clsx(
                "flex items-center font-black tracking-wider leading-tight text-center relative",
                "text-[35px]", // Base size from Login
                isSmall ? "scale-[0.6] origin-left" : "scale-100" // Scale down for mobile
            )}>
                {/* Static 'A', highest z-index */}
                <span style={{ ...textStyle, position: 'relative', zIndex: 11, top: '0px' }}>A</span>

                {/* P */}
                <div style={{ marginLeft: '-8px', position: 'relative', zIndex: 10, transform: 'translateY(-7px)' }}>
                    <span style={textStyle}>P</span>
                </div>

                {/* Racket Icon */}
                <div style={{ marginLeft: '-16px', position: 'relative', zIndex: 9 }}>
                    <PadelRacketIcon className="h-16 w-12 translate-y-[-3px]" />
                </div>

                {/* adeler */}
                {"adeler".split('').map((char, index) => {
                    const charMarginLeft = index === 0 ? '-18px' : '-4px';
                    return (
                        <div key={index} style={{ marginLeft: charMarginLeft, position: 'relative', zIndex: 8 - index }}>
                            <span style={textStyle}>
                                {char}
                            </span>
                        </div>
                    );
                })}

                {/* Ball Icon */}
                <div style={{ marginLeft: '-8px', position: 'relative', zIndex: 2 }}>
                    <PadelBallIcon className="h-6 w-6" />
                </div>

                {/* s */}
                <div style={{ marginLeft: '-8px', position: 'relative', zIndex: 1 }}>
                    <span style={textStyle}>s</span>
                </div>
            </div>
        </div>
    );
};
