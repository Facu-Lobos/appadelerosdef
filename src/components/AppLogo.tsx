import React from 'react';
import { PadelBallIcon, PadelRacketIcon } from './icons';
import clsx from 'clsx';

interface AppLogoProps {
  className?: string;
  variant?: 'default' | 'small';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className,
  variant = 'default',
}) => {
  const isSmall = variant === 'small';

  const textStyle: React.CSSProperties = {
    fontFamily: "'Poppins', sans-serif",
    color: '#000000',
    fontWeight: 900,
    WebkitTextStroke: '4px #ffffff',
    paintOrder: 'stroke fill',
  };

  return (
    <div className={clsx('flex items-center select-none', className)}>
      <div
        className={clsx(
          'flex items-center font-black leading-none relative',
          // 👇 tracking más compacto en mobile, normal en desktop
          'tracking-tight md:tracking-normal',
          isSmall ? 'text-[22px]' : 'text-[35px]'
        )}
      >
        {/* A */}
        <span style={{ ...textStyle, position: 'relative', zIndex: 11 }}>
          A
        </span>

        {/* P */}
        <div className="relative -ml-1 md:ml-0" style={{ zIndex: 10 }}>
          <span style={textStyle}>P</span>
        </div>

        {/* Racket */}
        <div className="relative -ml-3 md:-ml-1" style={{ zIndex: 9 }}>
          <PadelRacketIcon
            className={clsx(
              isSmall ? 'h-11 w-9' : 'h-16 w-12',
              'align-middle'
            )}
          />
        </div>

        {/* adeler */}
        {'adeler'.split('').map((char, index) => (
          <div
            key={index}
            className={clsx(
              'relative',
              index === 0
                ? '-ml-3 md:-ml-1'
                : '-ml-0.5 md:ml-0'
            )}
            style={{ zIndex: 8 - index }}
          >
            <span style={textStyle}>{char}</span>
          </div>
        ))}

        {/* Ball */}
        <div className="relative -ml-1 md:ml-0" style={{ zIndex: 2 }}>
          <PadelBallIcon
            className={clsx(
              isSmall ? 'h-4 w-4' : 'h-6 w-6',
              'align-middle'
            )}
          />
        </div>

        {/* s */}
        <div className="relative -ml-1 md:ml-0" style={{ zIndex: 1 }}>
          <span style={textStyle}>s</span>
        </div>
      </div>
    </div>
  );
};
