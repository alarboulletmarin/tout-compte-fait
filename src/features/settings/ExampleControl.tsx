import { useState } from 'react'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { Button, type ButtonVariant } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { toast } from '@/ui/toast'

/**
 * Charge un foyer d'exemple — le geste qui montre l'app avant qu'on l'ait
 * remplie.
 *
 * Une app neuve n'a rien à montrer : pas de courbe, pas de répartition, pas de
 * capital restant dû. Tout ce qui fait l'intérêt du produit demande des mois de
 * données, et personne n'en saisit cinq ans pour décider s'il va s'en servir.
 *
 * `confirm` dit d'où l'on vient, parce que la gravité n'est pas la même des deux
 * côtés. Dans les réglages, c'est un remplacement intégral, donc deux questions,
 * exactement comme un import (cahier §4.8). Au premier lancement, il n'y a rien
 * à perdre — le document n'a jamais été enregistré —, et demander à confirmer la
 * perte de rien n'apprend qu'une chose : que les questions de cette app ne
 * veulent rien dire.
 */
export function ExampleControl({
  confirm = true,
  variant = 'secondary',
  className,
}: {
  confirm?: boolean
  variant?: ButtonVariant
  className?: string
}) {
  const replaceData = useStore((s) => s.replaceData)
  const [asking, setAsking] = useState(false)

  /* Le générateur ne sert qu'ici, et une fois dans une vie : il vaut une
     vingtaine de kilo-octets que le démarrage n'a aucune raison de porter.
     Rien ne dépend du geste de l'utilisateur au-delà du clic — pas de
     presse-papiers, pas de téléchargement —, donc l'attente est sans risque. */
  const load = (): void => {
    void import('@/persistence/example')
      .then((module) => replaceData(module.exampleData()))
      .then(() => {
        setAsking(false)
        toast(t.settings.exampleLoaded)
      })
      /* Le module est chargé à la demande : hors ligne, ou le temps d'un
         déploiement, la requête échoue. Sans ce filet, le clic ne faisait
         rien — pas d'exemple, pas de message, et la boîte restait ouverte. */
      .catch(() => {
        setAsking(false)
        toast(t.settings.exampleFailed, 'danger')
      })
  }

  return (
    <>
      <Button
        variant={variant}
        {...(className === undefined ? {} : { className })}
        onClick={() => {
          if (confirm) setAsking(true)
          else load()
        }}
      >
        {t.settings.exampleLoad}
      </Button>

      <ConfirmDialog
        open={asking}
        title={t.settings.example}
        steps={[
          { question: t.settings.exampleConfirm, action: t.common.confirm },
          { question: t.settings.exampleConfirm2, action: t.settings.exampleLoad },
        ]}
        onCancel={() => {
          setAsking(false)
        }}
        onConfirm={load}
      />
    </>
  )
}
