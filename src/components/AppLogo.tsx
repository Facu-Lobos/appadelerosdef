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
    WebkitPaintOrder: 'stroke fill',
  };

  return (
    <div className={clsx('flex items-center select-none', className)}>
      <div
        className={clsx(
          'flex items-center font-black leading-tight relative',
          isSmall ? 'text-[22px]' : 'text-[35px]'
        )}
      >
        {/* A */}
        <span style={{ ...textStyle, position: 'relative', zIndex: 11 }}>
          A
        </span>

        {/* P */}
        <div style={{ marginLeft: '-5px' }}>
          <span style={{ ...textStyle, position: 'relative', zIndex: 10 }}>
            P
          </span>
        </div>

        {/* Racket (atrás de P, adelante de a) */}
        <div style={{ marginLeft: '-19px' }}>
          <PadelRacketIcon
            className={clsx(
              isSmall ? 'h-11 w-9' : 'h-16 w-12',
              'translate-y-[-3px]'
            )}
            style={{ position: 'relative', zIndex: 9.5 }}
          />
        </div>

        {/* adeler */}
        {'adeler'.split('').map((char, index) => {
          const marginLeft = index === 0 ? '-20px' : '-4px';
          return (
            <div key={index} style={{ marginLeft }}>
              <span
                style={{
                  ...textStyle,
                  position: 'relative',
                  zIndex: 8 - index,
                }}
              >
                {char}
              </span>
            </div>
          );
        })}

        {/* Ball (atrás de r, adelante de s) */}
        <div style={{ marginLeft: '-8px' }}>
          <PadelBallIcon
            className={clsx(
              isSmall ? 'h-4 w-4' : 'h-6 w-6'
            )}
            style={{ position: 'relative', zIndex: 1.5 }}
          />
        </div>

        {/* s */}
        <div style={{ marginLeft: '-8px' }}>
          <span style={{ ...textStyle, position: 'relative', zIndex: 1 }}>
            s
          </span>
        </div>
      </div>
    </div>
  );
};

