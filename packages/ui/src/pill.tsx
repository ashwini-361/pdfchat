import type { ReactNode } from 'react';

export const Pill = ({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning';
}) => {
  const background =
    tone === 'success'
      ? 'rgba(53, 184, 120, 0.16)'
      : tone === 'warning'
        ? 'rgba(255, 197, 79, 0.16)'
        : 'rgba(127, 157, 255, 0.16)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '6px 12px',
        background,
        color: '#f3f7ff',
        fontSize: 12,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
};
