import { useEffect, useState } from 'react'
import { t } from '@/i18n/strings'
import { copyText } from '@/lib/clipboard'
import { download } from '@/lib/download'
import { Button, type ButtonVariant } from '@/ui/Button'
import { toast } from '@/ui/toast'

type Schema = { text: string; filename: string }

/**
 * Le modèle de données, à emporter — le pendant de l'import.
 *
 * L'app sait importer un fichier, mais rien ne disait à quoi il ressemble : le
 * seul moyen d'en obtenir un était d'avoir déjà saisi ce qu'on cherche à
 * saisir. Quelqu'un dont le budget est écrit dans ses notes donne ce document à
 * un assistant, avec ses notes, et revient importer ce qui en sort.
 *
 * Deux gestes plutôt qu'un : coller dans une conversation est ce qu'on fait
 * neuf fois sur dix, mais la copie demande un contexte sécurisé et une
 * permission que le navigateur peut refuser. Le téléchargement, lui, marche
 * toujours — et c'est là que le refus de la copie renvoie.
 *
 * **Le document est préparé à l'affichage, pas au clic.** Il embarque le source
 * des types et le catalogue entier, soit une dizaine de kilo-octets que le
 * démarrage n'a aucune raison de porter — mais l'écrire dans le presse-papiers
 * exige de rester dans la tâche du clic, et un `await` au milieu du gestionnaire
 * fait perdre l'activation utilisateur sur Safari. Le module se charge donc
 * quand ce contrôle apparaît, et les boutons attendent qu'il soit là plutôt que
 * de promettre un geste qui échouerait.
 *
 * Le composant vit à part pour être posé aussi bien dans les réglages qu'au
 * premier lancement, comme `ImportControl` : la personne qui arrive avec ses
 * notes n'a pas encore de foyer, et n'a rien à faire d'un détour par
 * l'onboarding pour trouver de quoi s'en passer.
 */
export function SchemaControl({
  variant = 'secondary',
  className,
}: {
  variant?: ButtonVariant
  className?: string
}) {
  const [schema, setSchema] = useState<Schema | null>(null)

  useEffect(() => {
    let alive = true
    void import('@/persistence/schemaDoc')
      .then((module) => {
        if (alive) setSchema({ text: module.schemaDocument(), filename: module.SCHEMA_FILENAME })
      })
      /* Hors ligne, le chunk ne vient pas. Sans ce filet, les deux boutons
         restaient désactivés pour toujours, sans que rien ne dise pourquoi ni
         que recharger une fois revenu en ligne suffit. */
      .catch(() => {
        if (alive) toast(t.settings.schemaUnavailable, 'danger')
      })
    return () => {
      alive = false
    }
  }, [])

  const copy = (): void => {
    if (schema === null) return
    void copyText(schema.text).then((ok) => {
      toast(ok ? t.settings.schemaCopied : t.settings.schemaCopyFailed, ok ? 'default' : 'danger')
    })
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button variant={variant} disabled={schema === null} onClick={copy}>
          {t.settings.schemaCopy}
        </Button>
        <Button
          variant="ghost"
          disabled={schema === null}
          onClick={() => {
            if (schema === null) return
            download(new Blob([schema.text], { type: 'text/markdown' }), schema.filename)
          }}
        >
          {t.settings.schemaDownload}
        </Button>
      </div>
    </div>
  )
}
