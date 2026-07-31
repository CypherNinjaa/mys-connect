'use client';

/**
 * Registration code, colour-coded to match the member's app.
 *
 * Digits and letters get different colours so a code read aloud over a noisy
 * hall is easy to follow. Codes are minted from an alphabet that excludes
 * O, 0, I, 1 and L outright, so there is nothing to confuse — the amber
 * highlight only ever fires on a legacy row and is deliberately loud.
 */

const AMBIGUOUS = new Set(['O', '0', 'I', '1', 'L']);

interface RegistrationCodeTextProps {
  code: string | null;
  /** `sm` for table rows, `lg` for the ticket detail panel. */
  size?: 'sm' | 'lg';
}

export function RegistrationCodeText({ code, size = 'sm' }: RegistrationCodeTextProps) {
  if (!code) {
    return (
      <span className="text-xs text-gray-400 italic" title="This registration predates ticketing">
        Not issued
      </span>
    );
  }

  const sizeCls = size === 'lg' ? 'text-xl tracking-[0.18em]' : 'text-[13px] tracking-[0.08em]';

  return (
    <span className={`font-mono font-bold whitespace-nowrap ${sizeCls}`} title={code}>
      {code.split('').map((char, index) => {
        const key = `${char}-${index}`;
        if (char === '-') {
          return (
            <span key={key} className="text-gray-300 mx-0.5">
              -
            </span>
          );
        }
        if (AMBIGUOUS.has(char)) {
          return (
            <span key={key} className="text-amber-700 bg-amber-100 rounded px-0.5">
              {char}
            </span>
          );
        }
        const isDigit = char >= '0' && char <= '9';
        return (
          <span key={key} className={isDigit ? 'text-blue-700' : 'text-maroon'}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
