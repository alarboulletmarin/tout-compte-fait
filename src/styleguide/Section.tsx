import type { ReactNode } from 'react'

export function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    /* `gap-5` : un titre de section est à 20px de son contenu (DS §4), comme
       `PageTitle` et la présentation. Les sections qui posent un sous-titre
       groupent celui-ci avec son contenu (`flex-col gap-3`), sans quoi cette
       gouttière porterait aussi le sous-niveau et les deux rangs de titre
       deviendraient indiscernables. */
    <section className="flex flex-col gap-5 border-t border-border pt-8">
      <header className="flex flex-col gap-1">
        <h2 className="t-section">{title}</h2>
        {note !== undefined && <p className="t-label max-w-prose">{note}</p>}
      </header>
      {children}
    </section>
  )
}

export function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="t-eyebrow text-muted">{children}</h3>
}
