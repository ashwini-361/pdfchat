import type { PropsWithChildren } from 'react';

export const Card = ({
  children,
  title,
}: PropsWithChildren<{ title?: string }>) => (
  <section
    style={{
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 20,
      padding: 20,
      background:
        'linear-gradient(180deg, rgba(19,28,46,0.96), rgba(10,15,28,0.98))',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    }}
  >
    {title ? (
      <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 18 }}>{title}</h3>
    ) : null}
    {children}
  </section>
);

