import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { STORAGE_PATH } from '@/app/routes'
import { today } from '@/domain/date'
import { t } from '@/i18n/strings'
import { formatDate } from '@/i18n/format'
import { probeDurability, useStorageHealth } from '@/persistence/health'
import { canShareExport, downloadExport, readLastExport, shareExport } from '@/persistence/transfer'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Eyebrow } from '@/ui/Eyebrow'
import { ShareIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'
import { ExampleControl } from './ExampleControl'
import { ImportControl } from './ImportControl'
import { SchemaControl } from './SchemaControl'

/**
 * Un bloc d'intention dans la tuile des données — un titre, ce qu'il faut
 * savoir, le geste.
 *
 * Un titre et un filet plutôt qu'une carte par ligne : quatre cartes auraient
 * donné le même poids à « exporter tout ce que j'ai » et à « télécharger le
 * schéma », et c'est exactement le nivellement que cette page corrige.
 */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h2 className="t-body font-medium">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Une ligne du résumé : ce qu'on décrit, et ce qu'il en est.
 *
 * Deux colonnes plutôt qu'une phrase par ligne : trois faits qui se lisent en
 * diagonale, sans avoir à lire trois propositions pour trouver celui qu'on
 * était venu vérifier.
 */
function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <dt className="t-label">{label}</dt>
      <dd className="t-body">{value}</dd>
    </div>
  )
}

/**
 * Les données qui entrent et qui sortent, rangées par intention.
 *
 * Cinq gestes y vivaient à la file, du plus courant au plus définitif, tous
 * sous la même forme : exporter, importer, copier le schéma, le télécharger,
 * charger l'exemple, tout effacer. On lisait six boutons sans savoir lequel
 * rendait un fichier et lequel n'était pas rattrapable.
 *
 * Ils se groupent maintenant par ce qu'on vient faire — sauvegarder, restaurer,
 * comprendre le format, essayer — et l'effacement sort de la liste : il a sa
 * zone, en bas, avec son titre et sa conséquence écrite.
 */
export function DataSection() {
  const data = useStore((s) => s.data)
  const resetAll = useStore((s) => s.resetAll)
  const durable = useStorageHealth((s) => s.durable)
  const [lastExport, setLastExport] = useState(readLastExport)
  const [confirming, setConfirming] = useState(false)
  /* Sondé une fois, au premier rendu : la réponse dépend du navigateur et du
     type de fichier, pas de l'état de l'écran. */
  const [canShare] = useState(canShareExport)

  /* Cette vue est le premier endroit où l'on vient après avoir lu un avis de
     conservation : elle relit donc plutôt que de se fier à ce qui a été
     constaté à l'hydratation, qui peut dater de plusieurs heures. */
  useEffect(() => {
    void probeDurability()
  }, [])

  const doExport = (): void => {
    const on = today()
    downloadExport(data, on)
    setLastExport(on)
    toast(t.settings.exported)
  }

  const doShare = (): void => {
    const on = today()
    /* Rien avant l'appel : `shareExport` doit atteindre `share()` dans la tâche
       de ce clic, sinon Safari iOS refuse d'ouvrir la feuille. */
    void shareExport(data, on).then((outcome) => {
      // Feuille fermée : l'utilisateur a changé d'avis. Rien n'est parti, rien
      // n'est marqué, et il n'y a rien à lui dire.
      if (outcome === 'dismissed') return
      setLastExport(on)
      if (outcome === 'shared') toast(t.settings.shared)
      // Le fichier est sur l'appareil, mais pas là où il était demandé : ça se
      // remarque, sans quoi on le cherche sur l'autre appareil.
      else toast(t.settings.shareFailed, 'danger')
    })
  }

  return (
    <div className="cols">
      {/* Garder une copie d'un côté, tout perdre de l'autre. Les deux
          premières tuiles racontent la même chose dans l'ordre — où vivent
          les données, puis comment en sortir un fichier —, et elles restent
          donc l'une sous l'autre : les séparer en colonnes ferait lire les
          trois faits qui décident du geste *à côté* du bouton plutôt
          qu'avant lui.

          L'effacement part seul dans la colonne de droite, et cet
          isolement-là est le propos : au bout d'une pile, il était la suite
          de « exporter », donc la dernière étape d'une sauvegarde. À côté,
          il est ce qu'il est — l'autre branche, celle qui ne garde rien. */}
      <div className="cols-stack">
        {/* Où vivent les données, ce qu'on en promet, et depuis quand elles sont
            copiées ailleurs — les trois faits qui décident si l'on clique sur le
            bouton du dessous. Ils étaient répartis entre deux vues : la
            conservation ici invisible, l'export invisible là-bas. Ce n'est pas
            une vue de plus, c'est le haut de celle-ci ; « Sur cet appareil »
            garde le détail, les chiffres, les sauvegardes et le bouton qui
            redemande, et le lien y mène. */}
        <Tile className="gap-3">
          <dl className="flex flex-col gap-2">
            <Status label={t.storage.placeLabel} value={t.storage.placeValue} />
            <Status
              label={t.storage.keepLabel}
              value={
                durable === true
                  ? t.storage.keepPersistent
                  : durable === false
                    ? t.storage.keepFragile
                    : t.storage.keepUnknown
              }
            />
            <Status
              label={t.storage.lastExportLabel}
              value={lastExport === null ? t.storage.lastExportNever : formatDate(lastExport)}
            />
          </dl>
          {/* Même idiome que les autres liens autonomes de la zone : 44px de
              cible (DS §8), et le trait décollé du bas des lettres. */}
          <Link
            to={STORAGE_PATH}
            className="t-label inline-flex min-h-11 w-fit items-center rounded-input underline underline-offset-2"
          >
            {t.storage.statusMore}
          </Link>
        </Tile>

        <Tile className="gap-4">
          {/* Deux sorties pour un seul fichier, et chacune dit au-dessus ce
              qu'elle fait — le partage n'annonce pas dans la feuille ce qu'on
              décide avant de cliquer. Le second bouton ne s'affiche que si le
              navigateur sait envoyer un .json ; ailleurs, le bloc est
              exactement celui d'avant. */}
          <Block title={t.settings.backupGroup}>
            <p className="t-label">{t.settings.exportHint}</p>
            {canShare && <p className="t-label">{t.settings.shareHint}</p>}
            {/* La date du dernier export ne se redit pas ici : elle est trois
                centimètres au-dessus, dans le résumé, où elle a un sens à côté de
                ce que le navigateur promet. */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={doExport}>{t.settings.export}</Button>
              {canShare && (
                <Button variant="secondary" onClick={doShare}>
                  <ShareIcon size={18} />
                  {t.settings.share}
                </Button>
              )}
            </div>
          </Block>

          {/* La conséquence reste écrite au-dessus du bouton, et pas seulement
              dans la question : « remplace intégralement » est ce qui décide si
              l'on clique, et l'apprendre une fois la boîte ouverte est trop
              tard pour qui l'ouvre par curiosité. */}
          <Block title={t.settings.restoreGroup}>
            <p className="t-label">{t.settings.importHint}</p>
            <ImportControl className="w-fit" />
          </Block>

          {/* Le schéma se lit juste sous l'import, parce que c'est l'import qu'il
              sert : il n'a d'autre usage que de faire exister le fichier qu'on
              déposera à la ligne du dessus. */}
          <Block title={t.settings.schema}>
            <p className="t-label">{t.settings.schemaHint}</p>
            <SchemaControl />
          </Block>

          <Block title={t.settings.example}>
            <p className="t-label">{t.settings.exampleHint}</p>
            <ExampleControl className="w-fit" />
          </Block>
        </Tile>
      </div>

      {/* La zone sensible, à part et en dernier. Ce n'est pas la couleur qui
          prévient l'erreur — le DS §2.3 réserve le rouge aux dépassements et
          aux erreurs, et une tuile entière en rouge crierait sans rien dire :
          c'est la séparation, le titre qui nomme le geste, et la phrase qui en
          donne la portée. Le bouton, lui, prend la variante d'alerte : c'est
          celle de toutes les confirmations destructives de l'app.

          Triple confirmation : c'est le seul geste qui n'épargne rien, et rien
          n'est enregistré ailleurs que dans ce navigateur. */}
      <Tile className="gap-3">
        <Eyebrow>{t.settings.sensitive}</Eyebrow>
        <h2 className="t-body font-medium">{t.settings.resetTitle}</h2>
        <p className="t-label">{t.settings.resetHint}</p>
        <Button
          variant="danger"
          className="w-fit"
          onClick={() => {
            setConfirming(true)
          }}
        >
          {t.settings.reset}
        </Button>
        <ConfirmDialog
          open={confirming}
          title={t.settings.reset}
          steps={[
            { question: t.settings.resetConfirm1, action: t.common.confirm },
            { question: t.settings.resetConfirm2, action: t.common.confirm },
            { question: t.settings.resetConfirm3, action: t.settings.reset },
          ]}
          onCancel={() => {
            setConfirming(false)
          }}
          onConfirm={() => {
            void resetAll()
              .then(() => {
                setConfirming(false)
                setLastExport(null)
                toast(t.settings.resetDone)
              })
              // « Données effacées » sur un effacement qui n'a pas eu lieu est
              // le pire des messages : on croit reparti de zéro, et tout est
              // encore là.
              .catch(() => {
                setConfirming(false)
                toast(t.settings.resetFailed, 'danger')
              })
          }}
        />
      </Tile>
    </div>
  )
}
