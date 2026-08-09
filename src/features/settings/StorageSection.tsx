import { useCallback, useEffect, useState } from 'react'
import type { ISODate } from '@/domain/date'
import type { Data } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatBytes, formatDate, tpl } from '@/i18n/format'
import { type StorageUsage, estimateStorage } from '@/lib/storage'
import { type BackupEntry, listBackups, readBackup } from '@/persistence/backups'
import { askDurability, probeDurability, useStorageHealth } from '@/persistence/health'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Eyebrow } from '@/ui/Eyebrow'
import { DeviceIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'

/**
 * Ce qu'on relit après chaque geste : la vérité vient du navigateur.
 *
 * La durabilité n'est plus ici. Elle vivait dans cet état local, relue par cet
 * écran et par lui seul — si bien qu'elle n'existait nulle part ailleurs, et
 * qu'aucun bandeau ne pouvait s'en servir. Elle est passée dans
 * `persistence/health`, avec le reste de ce qui décrit l'appareil.
 */
type DeviceState = {
  usage: StorageUsage | null
  backups: BackupEntry[]
}

/** Une restauration validée : le document est relu **avant** qu'on demande. */
type PendingRestore = { on: ISODate; entry: BackupEntry; data: Data }

/**
 * Ce que ce navigateur promet, et ce qu'il garde.
 *
 * À part de « Exporter / importer », qui parle des fichiers qui sortent : ici on
 * parle de l'appareil. C'est aussi ici que la prose sur le fonctionnement du
 * navigateur a sa place — elle occupait une tuile de la page de réglages, où
 * personne ne vient pour lire comment un quota se négocie.
 *
 * Quatre niveaux de lecture, dans cet ordre : l'état, sa conséquence, le
 * chiffre, le geste. Les trois phrases avaient jusqu'ici la même lettre et la
 * même couleur, empilées comme un paragraphe — on ne pouvait pas savoir si le
 * navigateur s'était engagé sans les lire toutes.
 */
export function StorageSection() {
  const replaceData = useStore((s) => s.replaceData)
  const durable = useStorageHealth((s) => s.durable)
  const asked = useStorageHealth((s) => s.asked)
  const [state, setState] = useState<DeviceState>({ usage: null, backups: [] })
  const [pending, setPending] = useState<PendingRestore | null>(null)

  const read = useCallback(async (): Promise<DeviceState> => {
    const [usage, backups] = await Promise.all([estimateStorage(), listBackups()])
    return { usage, backups }
  }, [])

  useEffect(() => {
    let alive = true
    /* La durabilité se relit à l'ouverture de cet écran : elle a pu être
       accordée depuis l'hydratation — par un import, ou par le navigateur qui
       change d'avis en cours de session — et c'est ici qu'on vient vérifier. */
    void probeDurability()
    void read().then((next) => {
      if (alive) setState(next)
    })
    return () => {
      alive = false
    }
  }, [read])

  const refresh = (): void => {
    void read().then(setState)
  }

  const ask = async (): Promise<void> => {
    const answer = await askDurability()
    /* Trois réponses possibles, donc trois phrases. « Le navigateur a refusé »
       sur un navigateur qui n'a pas l'API lui prêterait une décision qu'il n'a
       pas prise. */
    toast(
      answer === true
        ? t.storage.persistGranted
        : answer === false
          ? t.storage.persistRefused
          : t.storage.persistSilent,
    )
    refresh()
  }

  /* Le document est relu et migré avant la question, jamais après : on ne fait
     pas confirmer un remplacement par une sauvegarde qu'on ne saurait pas
     ouvrir. C'est le patron d'`ImportControl`, pour la même raison. */
  const stage = async (entry: BackupEntry): Promise<void> => {
    const data = await readBackup(entry.on)
    if (data === null) return
    setPending({ on: entry.on, entry, data })
  }

  return (
    <>
      <Tile className="gap-3">
        {/* Aucune étiquette ici : la vue porte déjà « Sur cet appareil » en
            titre, et le répéter en tête de la première tuile l'aurait dit deux
            fois à deux centimètres d'écart.

            L'état en premier et dans la lettre du texte courant : c'est la seule
            chose qu'on vient vérifier ici. L'explication suit, à sa place. */}
        <p className="t-body">
          {durable === true
            ? t.storage.stateKept
            : durable === false
              ? t.storage.stateFragile
              : t.storage.stateUnknown}
        </p>
        <p className="t-label">
          {durable === true
            ? t.storage.persisted
            : durable === false
              ? t.storage.notPersisted
              : t.storage.persistUnknown}
        </p>
        {/* Le fait d'avoir déjà demandé, quand on l'a fait et qu'on a été
            refusé : sans lui, le bouton ci-dessous ressemble à une case qu'on
            aurait oublié de cocher. */}
        {durable === false && asked && (
          <p className="t-label">{t.storage.persistAsked}</p>
        )}
        <p className="t-label tnum">
          {state.usage === null
            ? t.storage.usageUnknown
            : tpl(t.storage.usage, formatBytes(state.usage.usage), formatBytes(state.usage.quota))}
        </p>
        {durable !== true && (
          <>
            <p className="t-label">{t.storage.installHint}</p>
            <Button
              variant="secondary"
              className="w-fit"
              onClick={() => {
                void ask()
              }}
            >
              {t.storage.persistAsk}
            </Button>
          </>
        )}
      </Tile>

      <Tile className="gap-3">
        <Eyebrow icon={DeviceIcon}>{t.storage.backups}</Eyebrow>
        <p className="t-label">{t.storage.backupsHint}</p>
        {state.backups.length === 0 ? (
          <p className="t-label">{t.storage.backupsEmpty}</p>
        ) : (
          <ul className="flex flex-col">
            {state.backups.map((entry) => (
              <li
                key={entry.on}
                className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-t border-border py-2 first:border-t-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="t-body tnum">{formatDate(entry.on)}</span>
                  <span className="t-axis">
                    {tpl(t.storage.backupContents, entry.entries, entry.recurrences)}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void stage(entry)
                  }}
                >
                  {t.storage.backupRestore}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      {/* Deux pas : une restauration remplace tout, exactement comme un import. */}
      <ConfirmDialog
        open={pending !== null}
        title={t.storage.backupRestore}
        steps={[
          {
            question:
              pending === null
                ? ''
                : tpl(
                    t.storage.backupConfirm1,
                    tpl(
                      t.storage.backupContents,
                      pending.entry.entries,
                      pending.entry.recurrences,
                    ),
                    formatDate(pending.on),
                  ),
            action: t.common.confirm,
          },
          { question: t.storage.backupConfirm2, action: t.storage.backupRestore },
        ]}
        onCancel={() => {
          setPending(null)
        }}
        onConfirm={() => {
          if (pending === null) return
          void replaceData(pending.data).then(() => {
            setPending(null)
            toast(t.storage.backupRestored)
            refresh()
          })
        }}
      />
    </>
  )
}
