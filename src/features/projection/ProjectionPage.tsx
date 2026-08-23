/* ============================================================================
 * L'écran de simulation — deux modes, et des champs qu'on voit.
 *
 * **Il répond d'abord, il lit le document ensuite.** L'écran ne savait simuler
 * que les comptes du document : il fallait donc en avoir, les cocher, et
 * comprendre qu'un rendement se règle compte par compte avant d'obtenir le
 * moindre chiffre. C'est la bonne lecture — celle que personne d'autre ne
 * produit —, mais ce n'est pas la première question qu'on pose. Elle est
 * devenue le second mode ; le premier tient en trois nombres tapés, et il
 * répond à quelqu'un qui n'a encore rien ouvert.
 *
 * **Un seul moteur, deux sources de nombres.** Le mode simple n'est pas une
 * calculatrice posée à côté : c'est la même `analyse`, le même `projectSeries`,
 * la même figure et le même tableau, avec une trajectoire au lieu de plusieurs
 * (cahier §4.6 ter). Rien n'a été dupliqué pour le rendre simple.
 *
 * **La page défile, et les réglages sont dessus.** L'écran tenait dans une
 * hauteur de fenêtre, ce qui obligeait ses cinq réglages à vivre dans autant de
 * feuilles montantes : on réglait à l'aveugle un versement dont on ne voyait
 * plus la courbe. Ce qui se règle en un contrôle est maintenant à plat — le
 * versement, la durée, le rendement —, ce qui se règle compte par compte reste
 * en feuille, parce que dix comptes à plat font une page de formulaire.
 *
 * **Ce qu'il refuse tient toujours plus de place que ce qu'il fait.** Les
 * simulateurs qui existent présélectionnent un taux flatteur, comptent en euros
 * courants et affichent le centime sur vingt ans : ce sont des outils de vente.
 * Ici il n'y a rien à vendre. D'où un rendement jamais deviné — celui de la
 * fiche, une valeur modeste, ou une fourchette large —, des montants arrondis à
 * ce que le modèle sait dire, et une réserve qui ne se replie pas.
 * ==========================================================================*/

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { type Money, ZERO } from '@/domain/money'
import { toRateInput } from '@/domain/rate'
import { SUPPORT_NEW_PATH } from '@/app/routes'
import {
  formatMoney,
  formatPercent,
  formatRoundedMoney,
  tpl,
} from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { useMembers, useSupportParts } from '@/store/selectors'
import { Button, IconButton } from '@/ui/Button'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { InfoIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { useCurrency } from '@/ui/currency'
import { AccountsSheet } from './AccountsSheet'
import { AmountSheet } from './AmountSheet'
import { DurationField } from './DurationField'
import { ExplainSheet } from './ExplainSheet'
import { OtherSettings } from './OtherSettings'
import { RateSheet } from './RateSheet'
import { SettingPill } from './SettingPill'
import { SimpleFields } from './SimpleFields'
import { SimulationChart } from './SimulationChart'
import { SimulationTable } from './SimulationTable'
import { formatDuration } from './duration'
import {
  DEFAULT_HIGH,
  DEFAULT_LOW,
  MAX_YEARS,
  MIN_YEARS,
  type Mode,
  type Period,
  type SimulationDraft,
  type SupportSetting,
  type View,
  analyse,
  perPeriod,
  pickedParts,
  readDraft,
  writeDraft,
  yearMarks,
} from './model'

/** Laquelle des feuilles est ouverte. Une seule à la fois, par construction. */
type OpenSheet = 'accounts' | 'rate' | 'amount' | 'explain' | null

/**
 * Ce qu'une adresse préfixe dans le simulateur, relu et borné.
 *
 * La même méfiance que `readDraft` applique au brouillon local : une URL vient
 * du dehors, et un « duree=abc » n'a pas à casser l'écran. Ce qui ne se lit pas
 * est simplement absent, et le brouillon gardé reste tel quel sur ce champ-là.
 *
 * Deux paramètres, et c'est tout ce dont la fiche d'un objectif a besoin pour
 * ouvrir le simulateur sur *sa* question : ses comptes, son échéance. Des
 * comptes nommés posent le mode avec eux — ouvrir le mode simple sur une
 * adresse qui désigne trois comptes aurait ignoré ce qu'elle demande.
 */
function presetFrom(params: URLSearchParams): Partial<SimulationDraft> {
  const years = Number(params.get('duree'))
  const accounts = params.get('comptes')
  const seed: Partial<SimulationDraft> = {}

  if (Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS) seed.years = years
  if (accounts !== null && accounts !== '') {
    const ids = accounts.split(',').filter((id) => id !== '' && id.length <= 64)
    if (ids.length > 0) {
      seed.picked = ids
      seed.mode = 'accounts'
    }
  }
  return seed
}

const views = (): { value: View; label: string }[] => [
  { value: 'chart', label: projection.viewChart },
  { value: 'table', label: projection.viewTable },
]

const modes = (): { value: Mode; label: string }[] => [
  { value: 'simple', label: projection.modeSimple },
  { value: 'accounts', label: projection.modeAccounts },
]

/** Le pourcentage d'un taux en points de base — deux décimales s'il en faut. */
const percent = (rateBp: number): string =>
  formatPercent(rateBp / 10_000, rateBp % 100 === 0 ? 0 : 2)

export function ProjectionPage() {
  const currency = useCurrency()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  /* Les derniers réglages sont relus une seule fois, au montage : ils sont le
     point de départ, pas une source qui piloterait l'écran. Le préréglage d'une
     adresse se pose **par-dessus**, dans l'initialisateur et non dans un effet :
     il ne doit s'appliquer qu'une fois — rejoué à chaque rendu, il empêcherait
     de décocher la moindre case — et un état initial est exactement l'endroit où
     React exprime « une fois ». */
  const [draft, setDraft] = useState<SimulationDraft>(() => ({
    ...readDraft(),
    ...presetFrom(params),
  }))
  const [sheet, setSheet] = useState<OpenSheet>(null)
  /* Le repli des réglages secondaires. En état d'écran et non dans le
     brouillon : c'est une position de lecture, pas un réglage — ce qu'on a
     réglé dedans, lui, se garde. */
  const [more, setMore] = useState(false)

  /* L'horizon avant les comptes, et non l'inverse : c'est lui qui décide quelles
     règles récurrentes sont assez durables pour entrer dans un versement
     constant. */
  const read = useSupportParts(draft.years * 12)
  const members = useMembers()

  /**
   * Le nom de chaque compte, complété de celui de qui le porte — mais seulement
   * dans un foyer qui compte plus d'une personne.
   *
   * Deux personnes ont très souvent un livret du même nom, et « Livret A » deux
   * fois dans une liste de cases à cocher ne désigne rien. Le complément est
   * posé ici et non dans le domaine : `supportPart` rend ce que le document
   * porte — un nom, un propriétaire —, et c'est l'écran qui sait s'il faut lever
   * une ambiguïté. Seul, personne ne porte deux fois le même compte, et répéter
   * son propre prénom à chaque ligne ne lèverait rien.
   */
  const parts = useMemo(() => {
    if (members.length <= 1) return read
    const names = new Map(members.map((one) => [one.id, one.name]))
    return read.map((part) => {
      const owner = names.get(part.memberId)
      return owner === undefined ? part : { ...part, label: tpl(projection.accountOwner, part.label, owner) }
    })
  }, [read, members])

  useEffect(() => {
    writeDraft(draft)
  }, [draft])

  const patch = (next: Partial<SimulationDraft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  /**
   * Un réglage posé sur un compte — créé s'il n'existait pas.
   *
   * Il part de ce que le compte porte déjà : passer en « une valeur » préremplit
   * le champ avec le taux de la fiche, faute de quoi on lirait une courbe sans
   * savoir à quel taux elle court. Sans taux posé, c'est la borne basse de la
   * fourchette — celle qui promet le moins.
   */
  const setSetting = (
    supportId: string,
    next: Partial<Omit<SupportSetting, 'supportId'>>,
  ): void => {
    setDraft((current) => {
      const part = parts.find((one) => one.supportId === supportId)
      const existing = current.settings.find((one) => one.supportId === supportId)
      const base: SupportSetting = existing ?? {
        supportId,
        mode: part?.rateBp === null ? 'range' : 'own',
        rateText: '',
        lowText: DEFAULT_LOW,
        highText: DEFAULT_HIGH,
        amountText: '',
      }
      const merged: SupportSetting = { ...base, ...next }
      if (merged.mode === 'flat' && merged.rateText.trim() === '') {
        merged.rateText = toRateInput(part?.rateBp ?? undefined) || DEFAULT_LOW
      }
      return {
        ...current,
        settings:
          existing === undefined
            ? [...current.settings, merged]
            : current.settings.map((one) => (one.supportId === supportId ? merged : one)),
      }
    })
  }

  const simple = draft.mode === 'simple'
  const { errors, result, missing } = analyse(draft, parts)
  const picked = pickedParts(parts, draft.picked)
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const approx = (value: Money): string => tpl(projection.approx, money(value))

  /* Le surtitre, le chiffre héros, et ce dont il est fait. Les trois répondent à
     la même question par le bout qui compte dans chaque cas : quand, combien, et
     de quoi c'est fait. */
  const heading =
    result === null ? projection.title : tpl(projection.resultIn, formatDuration(result.months))
  const hero =
    result === null
      ? '—'
      : result.single
        ? approx(result.arrival.low)
        : /* Un seul « ≈ » pour la fourchette entière : il dit que les deux
             nombres sortent d'un modèle, et le poser deux fois ferait lire deux
             approximations indépendantes. */
          tpl(
            projection.approx,
            tpl(projection.rangeShort, money(result.arrival.low), money(result.arrival.high)),
          )
  const last = result?.points.at(-1)

  /* De quoi le capital est fait, en rangées : au départ, versé, rendement. Trois
     lignes et non une phrase — « ≈ 42 000 € » impressionne, « 12 000 € versés et
     6 000 € de rendement » informe, et l'œil ne va chercher un nombre dans une
     phrase que s'il sait déjà qu'il y est. La couche à zéro ne s'écrit pas : un
     « 0 € au départ » est une ligne qui n'apprend rien. */
  const rows =
    last === undefined
      ? []
      : [
          ...(last.initial > ZERO ? [{ label: projection.layerInitial, value: last.initial }] : []),
          { label: projection.layerPaid, value: last.paid },
          { label: projection.layerGain, value: last.gain },
        ]

  /* Ce que chaque pilule annonce : la **valeur** du réglage, jamais son nom. */
  const accountsLabel =
    picked.length === 1 ? projection.accountsOne : tpl(projection.accountsMany, picked.length)
  const rateLabel =
    result === null
      ? projection.rangeUnknown
      : result.rateSpan.low === result.rateSpan.high
        ? percent(result.rateSpan.low)
        : tpl(projection.rangeShort, percent(result.rateSpan.low), percent(result.rateSpan.high))
  /* Le versement s'écrit **exactement**, et sans « ≈ » : c'est ce qui entre dans
     le calcul, pas ce qui en sort — « 4,2 k€/an » pour 4 200 € tapés se lirait
     comme un arrondi qu'on n'a pas demandé. */
  const amountLabel =
    result === null ? '—' : tpl(perPeriod(draft.every), formatMoney(result.amount, currency, false))
  const faulty = Object.keys(errors.supports)

  return (
    <>
      <PageTitle title={projection.title}>
        <IconButton
          label={projection.explain}
          onClick={() => {
            setSheet('explain')
          }}
        >
          <InfoIcon />
        </IconButton>
      </PageTitle>

      {/* Une colonne, plafonnée en largeur comme les autres écrans de lecture, et
          qui défile : les réglages d'abord, la réponse ensuite, la réserve en
          pied. C'est l'ordre dans lequel la question se pose. */}
      {/* Pas de plafond ici : `PageTitle` — et le bouton d'explication qu'il
          porte — vit **hors** de cette colonne, si bien qu'un contenu plafonné
          à 896px laissait ce bouton pendre à droite des tuiles dès que la
          fenêtre dépassait. C'est la mise en page de `/credits` et
          `/avances`, qui portent le même genre de titre. */}
      <div className="flex w-full flex-col gap-4">
        {/* --- Ce qu'on règle ------------------------------------------------
            Une seule tuile : la bascule de mode, les champs du mode courant, la
            durée qui vaut pour les deux, et le repli des deux réglages qu'on ne
            tourne pas en arrivant. */}
        /* `gap-5` sur la section, `gap-3` sur la pile intérieure : le titre
           se tenait à 16px de son contenu quand un titre en demande 20 (DS §4),
           et la tuile respirait à 16 quand sa voisine du dessous — cadre
           identique, posée juste en dessous — respire à 12. Deux rythmes pour
           deux cadres jumeaux se voient avant qu'on sache les nommer.
           Pas de `mb-5` sur la rangée de titre : dans une colonne flex la marge
           s'ajoute à la gouttière, le piège que `PageTitle` documente déjà. */
        <section className="tile flex flex-col gap-5 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="t-section">{projection.settings}</h2>
            <Segmented
              options={modes()}
              value={draft.mode}
              onChange={(mode) => {
                patch({ mode })
              }}
              label={projection.modeAxis}
            />
          </div>

          <div className="flex flex-col gap-3">

            {!simple && (
              /* Trois réglages qui se posent **compte par compte** : ils gardent
                 leur feuille, parce que dix comptes à plat font une page de
                 formulaire. Chaque pilule dit ce que vaut le réglage qu'elle
                 ouvre — le nom est dans son étiquette accessible. */
              <div className="flex flex-wrap gap-2">
                <SettingPill
                  label={projection.pillAccounts}
                  value={accountsLabel}
                  onClick={() => {
                    setSheet('accounts')
                  }}
                />
                <SettingPill
                  label={projection.pillRate}
                  value={rateLabel}
                  invalid={faulty.some(
                    (id) =>
                      errors.supports[id]?.rate !== undefined ||
                      errors.supports[id]?.low !== undefined ||
                      errors.supports[id]?.high !== undefined,
                  )}
                  onClick={() => {
                    setSheet('rate')
                  }}
                />
                <SettingPill
                  label={projection.pillAmount}
                  value={amountLabel}
                  invalid={faulty.some((id) => errors.supports[id]?.amount !== undefined)}
                  onClick={() => {
                    setSheet('amount')
                  }}
                />
              </div>
            )}

            {/* Une grille de champs, et **deux colonnes dès le plus petit écran**.
                Empilés, quatre champs et leurs aides poussaient la réponse à huit
                cents pixels du haut : on réglait un versement sans voir le chiffre
                qu'il produit. Les paires se lisent d'elles-mêmes — ce qu'on verse
                et ce qu'on a déjà, le taux et l'horizon.

                La durée y entre au même titre que les autres, dans les deux
                modes : elle ne se pose pas compte par compte, c'est l'horizon de
                toute la simulation. */}
            <div className="grid grid-cols-2 gap-4">
              {simple && (
                <SimpleFields
                  startText={draft.startText}
                  payText={draft.payText}
                  rateText={draft.rateText}
                  every={draft.every}
                  errors={errors}
                  onStart={(startText) => {
                    patch({ startText })
                  }}
                  onPay={(payText) => {
                    patch({ payText })
                  }}
                  onRate={(rateText) => {
                    patch({ rateText })
                  }}
                />
              )}
              <DurationField
                years={draft.years}
                onChange={(years) => {
                  patch({ years })
                }}
                {...(errors.years === undefined ? {} : { error: errors.years })}
              />
            </div>

            <Disclosure title={projection.more} open={more} onOpenChange={setMore}>
              <OtherSettings
                every={draft.every}
                onEvery={(every: Period) => {
                  patch({ every })
                }}
                constant={draft.constant}
                onConstant={(constant) => {
                  patch({ constant })
                }}
                inflationText={draft.inflationText}
                onInflation={(inflationText) => {
                  patch({ inflationText })
                }}
                {...(errors.inflation === undefined ? {} : { error: errors.inflation })}
              />
            </Disclosure>
          </div>
        </section>

        {/* --- Ce que ça donne ----------------------------------------------- */}
        <section className="tile flex flex-col gap-3 p-5 md:p-6">
          {result === null ? (
            /* Une invitation, pas un constat (DS §7). */
            <div className="flex flex-col items-start gap-3">
              <p className="t-body text-muted">{missing}</p>
              {parts.length === 0 && !simple && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigate(SUPPORT_NEW_PATH)
                  }}
                >
                  {projection.newSupport}
                </Button>
              )}
            </div>
          ) : (
            <>
              <Eyebrow>{heading}</Eyebrow>
              {/* Une fourchette porte deux montants et un tiret : à la taille du
                  chiffre héros, elle passe à la ligne sur tous les téléphones.
                  Elle descend donc d'un cran, et reste le plus gros chiffre de
                  l'écran. */}
              <p className={result.single ? 't-hero-fit tnum' : 't-tile-fit tnum'}>{hero}</p>

              <dl className="flex flex-wrap gap-x-6 gap-y-2">
                {rows.map((row) => (
                  <div key={row.label} className="flex flex-col">
                    <dt className="t-label">{row.label}</dt>
                    <dd className="t-num-body tnum">{money(row.value)}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex justify-end">
                <Segmented
                  options={views()}
                  value={draft.view}
                  onChange={(view) => {
                    patch({ view })
                  }}
                  label={projection.viewAxis}
                />
              </div>

              {draft.view === 'chart' ? (
                /* La figure a besoin d'une hauteur qu'on lui donne : sur une
                   page qui défile, un cadre flexible se réduirait à la hauteur
                   de son contenu, c'est-à-dire à rien. */
                <div className="flex h-72 flex-col md:h-96">
                  <SimulationChart
                    points={result.points}
                    months={result.months}
                    single={result.single}
                    guaranteed={result.guaranteed}
                    srText={[
                      tpl(
                        result.single ? projection.srChart : projection.srChartRange,
                        money(result.initial),
                        money(result.arrival.low),
                        result.single ? formatDuration(result.months) : money(result.arrival.high),
                        formatDuration(result.months),
                      ),
                      tpl(projection.srContributed, money(result.paid)),
                    ].join(' ')}
                  />
                </div>
              ) : (
                /* Le tableau, lui, prend la hauteur de ses lignes : c'est la
                   page qui défile, et une seconde zone de défilement dans la
                   première se lit mal au doigt. */
                <SimulationTable
                  points={result.points}
                  marks={yearMarks(result.months)}
                  single={result.single}
                  initial={result.initial}
                />
              )}
            </>
          )}
        </section>

        {/* La réserve, en pied et jamais repliée : c'est la seule chose de cet
            écran qui soit vraie quels que soient les chiffres réglés, et une mise
            en garde qu'il faut ouvrir n'en est plus une. La lecture en euros
            d'aujourd'hui se dit juste avant, parce qu'elle change ce que tous les
            montants au-dessus signifient. */}
        <p className="t-label">
          {result !== null && result.inflationBp > 0
            ? `${tpl(projection.constantOn, percent(result.inflationBp))} `
            : ''}
          {projection.caveat}
        </p>
      </div>

      {/* Les trois feuilles qui règlent compte par compte n'existent que dans le
          mode qui les ouvre : une feuille fermée reste dans le DOM — c'est un
          `<dialog>` sans `open` —, et « Versement » s'y annoncerait à côté du
          champ du même nom. */}
      {!simple && (
        <>
          <AccountsSheet
            open={sheet === 'accounts'}
            onClose={() => {
              setSheet(null)
            }}
            parts={parts}
            picked={draft.picked}
            onPick={(ids) => {
              patch({ picked: ids })
            }}
            runs={result?.runs ?? []}
          />

          <RateSheet
            open={sheet === 'rate'}
            onClose={() => {
              setSheet(null)
            }}
            parts={picked}
            runs={result?.runs ?? []}
            settings={draft.settings}
            errors={errors.supports}
            onChange={setSetting}
          />

          <AmountSheet
            open={sheet === 'amount'}
            onClose={() => {
              setSheet(null)
            }}
            parts={picked}
            settings={draft.settings}
            errors={errors.supports}
            every={draft.every}
            onChange={setSetting}
          />
        </>
      )}

      <ExplainSheet
        open={sheet === 'explain'}
        onClose={() => {
          setSheet(null)
        }}
      />
    </>
  )
}
