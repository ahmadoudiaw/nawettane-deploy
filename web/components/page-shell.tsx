import { ReactNode } from 'react';

export function PageShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="page">
      <div className="shell stack">
        <section className="hero">
          {eyebrow ? <div className="hero__eyebrow">{eyebrow}</div> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </section>
        {children}
      </div>
    </main>
  );
}
