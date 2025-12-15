import React from 'react';
import { PadelBallIcon, PadelRacketIcon, LetterAIcon } from './icons';
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
        WebkitTextStroke: isSmall ? '3px #ffffff' : '4px #ffffff', // Thicker stroke because half is hidden
        paintOrder: 'stroke fill',
        WebkitPaintOrder: 'stroke fill', // Safari support
    };

    const fontSize = isSmall ? 'text-2xl' : 'text-[35px]';
    const racketSize = isSmall ? 'h-10 w-8' : 'h-16 w-12';
    const ballSize = isSmall ? 'h-5 w-5' : 'h-6 w-6';
    const translateRacket = isSmall ? 'translate-y-[0px]' : 'translate-y-[0px]';

    // Custom A Icon Sizing
    const aIconSize = isSmall ? 'h-6 w-6' : 'h-[36px] w-[36px]';
    const aIconMargin = isSmall ? '-2px' : '4px'; // Tightened for mobile (overlap)

    // Letter spacing adjustments
    // Specific tweaks can be proportional

    return (
        <div className={clsx("flex items-center select-none", className)}>
            <div className={clsx("flex items-center font-black tracking-wider leading-tight text-center relative pl-2", fontSize, isSmall && "mt-1")}>
                {/* A (Custom Icon) */}
                <div style={{ marginRight: aIconMargin, position: 'relative', zIndex: 11, display: 'flex', alignItems: 'center' }}>
                    <LetterAIcon className={aIconSize} />
                </div>

                {/* P */}
                <div style={{ marginLeft: isSmall ? '0px' : '0px' }}> {/* Removed negative margin */}
                    <span style={{ ...textStyle, display: 'inline-block', position: 'relative', zIndex: 10 }}>
                        P
                    </span>
                </div>

                {/* Racket Icon (replaces second P) */}
                <div style={{ marginLeft: isSmall ? '-4px' : '-10px', position: 'relative', zIndex: 9 }}>
                    <PadelRacketIcon className={clsx(racketSize, translateRacket)} />
                </div>

                {/* adeler */}
                {"adeler".split('').map((char, index) => {
                    const charMarginLeft = index === 0
                        ? (isSmall ? '-5px' : '-14px') // Tighter overlap
                        : (isSmall ? '-2px' : '-2px'); // Consistent tight spacing

                    return (
                        <div key={index} style={{ marginLeft: charMarginLeft, position: 'relative', zIndex: 8 - index }}>
                            <span style={textStyle}>
                                {char}
                            </span>
                        </div>
                    );
                })}

                {/* Ball Icon (replaces O) */}
                <div style={{ marginLeft: isSmall ? '-2px' : '-6px', position: 'relative', zIndex: 2 }}>
                    <PadelBallIcon className={clsx(ballSize, "animate-bounce-slow")} />
                </div>

                {/* s */}
                <div style={{ marginLeft: isSmall ? '-2px' : '-6px', position: 'relative', zIndex: 1 }}>
                    <span style={textStyle}>s</span>
                </div>
            </div>
        </div>
    );
};
