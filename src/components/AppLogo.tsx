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

  const overlap = isSmall ? '-ml-[2px]' : '-ml-[3px]';

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
          isSmall ? 'text-[22px]' : 'text-[35px]'
        )}
      >
        {/* A */}
        <span style={{ ...textStyle, position: 'relative', zIndex: 20 }}>
          A
        </span>

        {/* P */}
        <span
          className={clsx(overlap)}
          style={{ ...textStyle, position: 'relative', zIndex: 19 }}
        >
          P
        </span>

        {/* Racket */}
        <div className={clsx(overlap, 'relative')} style={{ zIndex: 18 }}>
          <PadelRacketIcon
            className={clsx(
              isSmall ? 'h-11 w-9' : 'h-16 w-12',
              'align-middle'
            )}
          />
        </div>

        {/* adeler */}
        {'adeler'.split('').map((char, index) => (
          <span
            key={index}
            className={clsx(overlap)}
            style={{ ...textStyle, position: 'relative', zIndex: 17 - index }}
          >
            {char}
          </span>
        ))}

        {/* Ball */}
        <div className={clsx(overlap, 'relative')} style={{ zIndex: 5 }}>
          <PadelBallIcon
            className={clsx(
              isSmall ? 'h-4 w-4' : 'h-6 w-6',
              'align-middle'
            )}
          />
        </div>

        {/* s */}
        <span
          className={clsx(overlap)}
          style={{ ...textStyle, position: 'relative', zIndex: 4 }}
        >
          s
        </span>
      </div>
    </div>
  );
};
