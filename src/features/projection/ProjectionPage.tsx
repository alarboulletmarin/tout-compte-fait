/* ============================================================================
 * L'écran de simulation — un instrument, et il tient dans une page.
 *
 * **Il simule des comptes, un par un.** L'écran savait faire trois choses :
 * projeter quatre nombres tapés à la main, projeter un support, projeter « toute
 * l'épargne d'une personne » sous un taux moyen qui n'existe pas. La première
 * est une calculatrice qu'on trouve n'importe où ; la troisième additionnait des
 * trajectoires incomparables avant de les projeter. Ce qui reste est la
 * deuxième, généralisée : on **coche les comptes**, chacun court à son
 * rendement et reçoit son versement, et la figure est la somme de leurs
 * trajectoires. Cocher un seul compte fait de tout l'écran la trajectoire de ce
 * compte-là — c'est la lecture unitaire, et elle ne demande aucun autre écran.
 *
 * **Une page, et elle ne défile pas.** C'est la contrainte qui a décidé de la
 * forme : la réponse en tête, la figure au milieu qui prend toute la place
 * restante, les réglages en pilules au bas du pouce, la réserve en pied. Ce qui
 * se règle s'ouvre en feuille montante — cinq feuilles, une par question — parce
 * qu'un réglage ouvert coûte de la hauteur à la figure qu'il sert. L'écran
 * empilait dix-sept blocs dans une colonne de trois mille pixels ; on y réglait
 * un taux en bas et on remontait voir ce que ça changeait.
 *
 * **Deux lectures, à un appui l'une de l'autre.** La figure répond à « où ça
 * va », le tableau à « combien, dans sept ans ». Le tableau n'est donc plus un
 * repli sous la courbe : c'est une vue, et elle porte les mêmes séries — il n'y
 * a pas de second calcul (cahier §4.6 ter).
 *
 * **Ce qu'il refuse tient toujours plus de place que ce qu'il fait.** Les
 * simulateurs qui existent présélectionnent un taux flatteur, comptent en euros
 * courants et affichent le centime sur vingt ans : ce sont des outils de vente.
 * Ici il n'y a rien à vendre. D'où un rendement jamais deviné — celui de la
 * fiche, ou une fourchette large —, des montants arrondis à ce que le modèle sait
 * dire, et une réserve qui ne se replie pas.
 * ==========================================================================*/

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { type Money, ZERO } from '@/domain/money'
import { toRateInput } from '@/domain/rate'
import { SUPPORT_NEW_PATH } from '@/app/routes'
import { formatMoney, formatPercent, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { useMembers, useSupportParts } from '@/store/selectors'
import { Button, IconButton } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { InfoIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { useCurrency } from '@/ui/currency'
import { AccountsSheet } from './AccountsSheet'
import { AmountSheet } from './AmountSheet'
import { DurationSheet } from './DurationSheet'
import { ExplainSheet } from './ExplainSheet'
import { InflationSheet } from './InflationSheet'
import { RateSheet } from './RateSheet'
import { SettingPill } from './SettingPill'
import { SimulationChart } from './SimulationChart'
import { SimulationTable } from './SimulationTable'
import { formatDuration } from './duration'
import {
  DEFAULT_HIGH,
  DEFAULT_LOW,
  MAX_YEARS,
  MIN_YEARS,
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
type OpenSheet = 'accounts' | 'rate' | 'amount' | 'duration' | 'inflation' | 'explain' | null

/**
 * Ce qu'une adresse préfixe dans le simulateur, relu et borné.
 *
 * La même méfiance que `readDraft` applique au brouillon local : une URL vient
 * du dehors, et un « duree=abc » n'a pas à casser l'écran. Ce qui ne se lit pas
 * est simplement absent, et le brouillon gardé reste tel quel sur ce champ-là.
 *
 * Deux paramètres, et c'est tout ce dont la fiche d'un objectif a besoin pour
 * ouvrir le simulateur sur *sa* question : ses comptes, son échéance.
 */
function presetFrom(params: URLSearchParams): Partial<SimulationDraft> {
  const years = Number(params.get('duree'))
  const accounts = params.get('comptes')
  const seed: Partial<SimulationDraft> = {}

  if (Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS) seed.years = years
  if (accounts !== null && accounts !== '') {
    const ids = accounts.split(',').filter((id) => id !== '' && id.length <= 64)
    if (ids.length > 0) seed.picked = ids
  }
  return seed
}

const views = (): { value: View; label: string }[] => [
  { value: 'chart', label: projection.viewChart },
  { value: 'table', label: projection.viewTable },
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

  const { errors, result, missing } = analyse(draft, parts)
  const picked = pickedParts(parts, draft.picked)
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const approx = (value: Money): string => tpl(projection.approx, money(value))

  /* Le surtitre, le chiffre héros, et la ligne qui dit d'où il sort. Les trois
     répondent à la même question par le bout qui compte dans chaque cas :
     quand, combien, et de quoi c'est fait. */
  const heading = result === null ? projection.title : tpl(projection.resultIn, formatDuration(result.months))
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
  const split =
    last === undefined
      ? null
      : last.initial > ZERO
        ? tpl(projection.splitFull, money(last.initial), money(last.paid), money(last.gain))
        : tpl(projection.splitPaid, money(last.paid), money(last.gain))

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
      {/* Le titre existe, il ne s'affiche pas : la tuile de réponse porte déjà
          l'en-tête de l'écran, et un `<h1>` au-dessus aurait coûté à la figure
          les soixante pixels qu'il prend. Un écran sans titre ne se repère pas
          au lecteur d'écran — celui-ci en a un, et il s'annonce en arrivant. */}
      <PageTitle title={projection.title} hidden />

      {/* La page entière, à la hauteur de la fenêtre : c'est la figure qui prend
          ce qui reste, et rien ne défile. Ce qu'on retranche est le cadre de la
          coquille (`AppShell`) — sa gouttière du haut, la barre d'onglets, le
          dégagement du bouton flottant —, et il change deux fois : la gouttière
          s'élargit à 768px, la barre et le bouton disparaissent à 1024px au
          profit de la colonne latérale. D'où un token intermédiaire plutôt que
          trois hauteurs recopiées : la soustraction s'écrit une fois, et ce sont
          ses termes qui varient.

          Un plancher, tout de même : sur une fenêtre trop basse pour tout tenir,
          mieux vaut défiler de cent pixels que rendre la figure illisible. */}
      <div
        /* Une pile à gouttière, plafonnée en largeur comme les autres écrans de
           lecture. `min-h` est le plancher sous lequel la figure cesserait
           d'être lisible — la somme de ce qui l'entoure, plus cent pixels de
           tracé. */
        className={[
          'flex min-h-[38rem] w-full max-w-4xl flex-col gap-3',
          '[--sim-chrome:calc(1rem+var(--nav-h)+5.5rem+env(safe-area-inset-bottom,0px))]',
          'md:[--sim-chrome:calc(2rem+var(--nav-h)+5.5rem+env(safe-area-inset-bottom,0px))]',
          'lg:[--sim-chrome:4.5rem]',
          'h-[calc(100dvh-var(--sim-chrome))]',
        ].join(' ')}
      >
        {/* La réponse, et elle ne quitte jamais l'écran : on vient ici pour
            tourner des boutons, et régler sans voir ce qu'on change revient à
            jouer à un jeu dont le score est derrière soi. */}
        {/* `div.tile` et non `Tile` : le composant pose un cadre de 20 à 24
            pixels, calibré pour une tuile de tableau de bord qu'on lit. Ici la
            page est bornée en hauteur et chaque pixel de cadre est un pixel de
            figure en moins — la classe donne le même aspect, à un cadre près
            qu'on choisit. */}
        <div className="tile flex shrink-0 flex-col gap-1 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Eyebrow>{heading}</Eyebrow>
            <div className="flex items-center gap-1">
              <Segmented
                options={views()}
                value={draft.view}
                onChange={(view) => {
                  patch({ view })
                }}
                label={projection.viewAxis}
              />
              <IconButton
                label={projection.explain}
                onClick={() => {
                  setSheet('explain')
                }}
              >
                <InfoIcon />
              </IconButton>
            </div>
          </div>
          {/* `t-tile-fit` et non `t-hero-fit` : à 54px, « ≈ 163 k€ – 181 k€ »
              passe à la ligne sur tous les téléphones, et deux lignes de chiffre
              héros coûtent quarante pixels à la figure qu'on est venu voir. Le
              chiffre reste le plus gros de l'écran, il cesse d'en prendre le
              tiers. */}
          <p className="t-tile-fit tnum">{hero}</p>
          {split !== null && <p className="t-label">{split}</p>}
        </div>

        {/* La figure, ou les nombres — et c'est ce bloc qui prend toute la
            hauteur restante. */}
        <div className="tile flex min-h-0 flex-1 flex-col gap-2 p-3 md:p-5">
          {result === null ? (
            /* Une invitation, pas un constat (DS §7) — et centrée dans le cadre
               qu'elle occupe, sans anneau : la tuile masque ce qui dépasse, et un
               état vide de deux cents pixels de haut se couperait sur une fenêtre
               basse. */
            <div className="flex min-h-0 flex-1 flex-col items-start justify-center gap-3">
              <p className="t-body text-muted">{missing}</p>
              {parts.length === 0 && (
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
          ) : draft.view === 'chart' ? (
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
          ) : (
            <SimulationTable
              points={result.points}
              marks={yearMarks(result.months)}
              single={result.single}
              initial={result.initial}
            />
          )}
        </div>

        {/* Les réglages, au bas du pouce. Chaque pilule dit ce que vaut le
            réglage qu'elle ouvre — le nom est dans son étiquette accessible. */}
        <div className="flex shrink-0 flex-wrap gap-2">
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
          <SettingPill
            label={projection.pillDuration}
            value={formatDuration(draft.years * 12)}
            invalid={errors.years !== undefined}
            onClick={() => {
              setSheet('duration')
            }}
          />
          <SettingPill
            label={projection.pillInflation}
            value={
              draft.constant
                ? tpl(projection.inflationOn, draft.inflationText.trim() || '—')
                : projection.inflationOff
            }
            invalid={errors.inflation !== undefined}
            onClick={() => {
              setSheet('inflation')
            }}
          />
        </div>

        {/* La réserve, en pied et jamais repliée : c'est la seule chose de cet
            écran qui soit vraie quels que soient les chiffres réglés, et une mise
            en garde qu'il faut ouvrir n'en est plus une. La lecture en euros
            d'aujourd'hui se dit juste avant, parce qu'elle change ce que tous les
            montants au-dessus signifient. */}
        <p className="t-label shrink-0">
          {result !== null && result.inflationBp > 0
            ? `${tpl(projection.constantOn, percent(result.inflationBp))} `
            : ''}
          {projection.caveat}
        </p>
      </div>

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
        onEvery={(every: Period) => {
          patch({ every })
        }}
        onChange={setSetting}
      />

      <DurationSheet
        open={sheet === 'duration'}
        onClose={() => {
          setSheet(null)
        }}
        years={draft.years}
        onChange={(years) => {
          patch({ years })
        }}
        {...(errors.years === undefined ? {} : { error: errors.years })}
      />

      <InflationSheet
        open={sheet === 'inflation'}
        onClose={() => {
          setSheet(null)
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

      <ExplainSheet
        open={sheet === 'explain'}
        onClose={() => {
          setSheet(null)
        }}
      />
    </>
  )
}
