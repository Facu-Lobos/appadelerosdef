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
          'flex items-center font-black tracking-wider leading-none relative',
          isSmall ? 'text-[22px]' : 'text-[35px]'
        )}
      >
        {/* A */}
        <span style={{ ...textStyle, position: 'relative', zIndex: 11 }}>
          A
        </span>

        {/* P */}
        <div
          style={{
            marginLeft: '-4px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <span style={textStyle}>P</span>
        </div>

        {/* Racket */}
        <div
          style={{
            marginLeft: '-8px',
            position: 'relative',
            zIndex: 9,
          }}
        >
          <PadelRacketIcon
            className={clsx(
              isSmall ? 'h-10 w-8' : 'h-16 w-12',
              'align-middle'
            )}
          />
        </div>

        {/* adeler */}
        {'adeler'.split('').map((char, index) => (
          <div
            key={index}
            style={{
              marginLeft: index === 0 ? '-8px' : '-2px',
              position: 'relative',
              zIndex: 8 - index,
            }}
          >
            <span style={textStyle}>{char}</span>
          </div>
        ))}

        {/* Ball */}
        <div
          style={{
            marginLeft: '-3px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <PadelBallIcon
            className={clsx(
              isSmall ? 'h-4 w-4' : 'h-6 w-6',
              'align-middle'
            )}
          />
        </div>

        {/* s */}
        <div
          style={{
            marginLeft: '-3px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span style={textStyle}>s</span>
        </div>
      </div>
    </div>
  );
};
