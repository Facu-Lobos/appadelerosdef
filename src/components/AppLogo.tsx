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
        color: '#000000', // Black letters
        fontWeight: '900',
        lineHeight: 1,
        WebkitTextStroke: isSmall ? '0.5px #ffffff' : '0.75px #ffffff', // White stroke
    };

    const fontSize = isSmall ? 'text-2xl' : 'text-[35px]';
    const racketSize = isSmall ? 'h-10 w-8' : 'h-16 w-12';
    const ballSize = isSmall ? 'h-5 w-5' : 'h-6 w-6';
    const translateRacket = isSmall ? 'translate-y-[0px]' : 'translate-y-[0px]';

    // Letter spacing adjustments
    // Specific tweaks can be proportional

    return (
        <div className={clsx("flex items-center select-none", className)}>
            <div className={clsx("flex items-center font-black tracking-wider leading-tight text-center relative", fontSize, isSmall && "mt-1")}>
                {/* A */}
                <span style={{ ...textStyle, position: 'relative', zIndex: 11 }}>A</span>

                {/* P */}
                <div style={{ marginLeft: isSmall ? '-4px' : '-8px' }}>
                    <span style={{ ...textStyle, display: 'inline-block', position: 'relative', zIndex: 10 }}>
                        P
                    </span>
                </div>

                {/* Racket Icon (replaces second P) */}
                <div style={{ marginLeft: isSmall ? '-10px' : '-19px', position: 'relative', zIndex: 9 }}>
                    <PadelRacketIcon className={clsx(racketSize, translateRacket)} />
                </div>

                {/* adeler */}
                {"adeler".split('').map((char, index) => {
                    const charMarginLeft = index === 0
                        ? (isSmall ? '-12px' : '-25px')
                        : (isSmall ? '-4px' : '-8px');

                    return (
                        <div key={index} style={{ marginLeft: charMarginLeft, position: 'relative', zIndex: 8 - index }}>
                            <span style={textStyle}>
                                {char}
                            </span>
                        </div>
                    );
                })}

                {/* Ball Icon (replaces O) */}
                <div style={{ marginLeft: isSmall ? '-4px' : '-8px', position: 'relative', zIndex: 2 }}>
                    <PadelBallIcon className={clsx(ballSize, "animate-bounce-slow")} />
                </div>

                {/* s */}
                <div style={{ marginLeft: isSmall ? '-4px' : '-8px', position: 'relative', zIndex: 1 }}>
                    <span style={textStyle}>s</span>
                </div>
            </div>
        </div>
    );
};
