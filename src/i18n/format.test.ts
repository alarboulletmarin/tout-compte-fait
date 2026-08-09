import { beforeEach, describe, expect, it } from 'vitest'
import { money } from '@/domain/money'
import {
  de,
  decimalSeparator,
  enumerate,
  formatBytes,
  formatDate,
  formatDelta,
  formatMoney,
  formatMonthDay,
  formatPercent,
  formatRelativeDays,
  formatRoundedMoney,
  formatYearMonth,
  moneyParts,
  symbolFirst,
} from './format'
import { applyLocale } from './strings'

/* Les espaces de la mise en forme française sont insécables : les tests les
   normalisent plutôt que de les recopier, sans quoi ils passent ou échouent
   selon le caractère qu'a laissé l'éditeur. */
const plain = (text: string): string => text.replace(/[\u00A0\u202F]/g, ' ')

describe('mise en forme d’un montant', () => {
  it('rend les centimes à part, pour que le DS puisse les réduire', () => {
    const parts = moneyParts(money(128_450), 'EUR')
    expect(plain(parts.integer)).toBe('1 284')
    expect(parts.fraction).toBe('50')
  })

  it('porte le signe négatif, jamais le positif', () => {
    expect(moneyParts(money(-4_290), 'EUR').sign).toBe('−')
    expect(moneyParts(money(4_290), 'EUR').sign).toBe('')
  })

  it('écrit un montant complet', () => {
    expect(plain(formatMoney(money(206_690), 'EUR'))).toBe('2 066,90 €')
  })

  /* Tronquer ferait lire « reste 56 € à payer » sur 56,69 € — une erreur
     systématiquement en faveur de qui la lit. */
  it('arrondit l’unité quand les centimes ne s’affichent pas', () => {
    expect(plain(formatMoney(money(5_669), 'EUR', false))).toBe('57 €')
    expect(plain(formatMoney(money(5_620), 'EUR', false))).toBe('56 €')
    expect(plain(formatMoney(money(5_650), 'EUR', false))).toBe('57 €')
  })

  it('arrondit de la même façon de part et d’autre de zéro', () => {
    expect(plain(formatMoney(money(-5_669), 'EUR', false))).toBe('−57 €')
  })

  it('n’arrondit pas l’unité tant que les centimes s’affichent', () => {
    expect(plain(formatMoney(money(5_669), 'EUR'))).toBe('56,69 €')
  })
})

describe('montant sorti d’un modèle', () => {
  /* La règle de l'écran des projections : la précision affichée ne dépasse pas
     celle du calcul. « 202 136,25 € » ferait passer une hypothèse pour un
     relevé de compte — c'est le défaut central des simulateurs de vente. */
  it('arrondit au millier au-delà de dix mille euros', () => {
    expect(plain(formatRoundedMoney(money(20_213_625), 'EUR'))).toBe('202 k€')
    expect(plain(formatRoundedMoney(money(1_049_900), 'EUR'))).toBe('10 k€')
  })

  it('garde une décimale entre mille et dix mille, où l’entier serait trop grossier', () => {
    expect(plain(formatRoundedMoney(money(840_000), 'EUR'))).toBe('8,4 k€')
  })

  it('passe au million sans jamais écrire sept chiffres', () => {
    expect(plain(formatRoundedMoney(money(124_000_000), 'EUR'))).toBe('1,2 M€')
  })

  it('arrondit à la dizaine sous mille euros — un virement ne se programme pas au centime', () => {
    expect(plain(formatRoundedMoney(money(25_437), 'EUR'))).toBe('250 €')
  })

  it('garde l’euro entier sous cent, où la dizaine cacherait le chiffre', () => {
    expect(plain(formatRoundedMoney(money(3_449), 'EUR'))).toBe('34 €')
    expect(plain(formatRoundedMoney(money(0), 'EUR'))).toBe('0 €')
  })

  it('n’écrit jamais de centimes, à aucun palier', () => {
    for (const cents of [1, 999, 12_345, 987_654, 12_345_678, 1_234_567_890]) {
      expect(formatRoundedMoney(money(cents), 'EUR')).not.toContain(',0')
      expect(plain(formatRoundedMoney(money(cents), 'EUR'))).not.toMatch(/,\d\d/)
    }
  })

  it('porte le signe négatif comme le reste de l’app', () => {
    expect(plain(formatRoundedMoney(money(-20_213_625), 'EUR'))).toBe('−202 k€')
  })
})

describe('taille sur l’appareil', () => {
  it('compte en unités décimales, comme le navigateur les rapporte', () => {
    // Ce sont celles de l'explorateur de fichiers : un chiffre affiché ici doit
    // se retrouver à l'identique à côté du fichier exporté.
    expect(plain(formatBytes(0))).toBe('0 o')
    expect(plain(formatBytes(512))).toBe('512 o')
    expect(plain(formatBytes(1000))).toBe('1 ko')
    expect(plain(formatBytes(1_500_000))).toBe('1,5 Mo')
    expect(plain(formatBytes(50_000_000_000))).toBe('50 Go')
  })

  it('n’affiche jamais de taille négative', () => {
    expect(plain(formatBytes(-1))).toBe('0 o')
  })
})

/**
 * La mise en forme anglaise, et ce qui la sépare de la française.
 *
 * Ce n'est pas une redite des tests du dessus : ce qu'on vérifie ici est
 * précisément **ce qu'une traduction ne peut pas porter** — la place du symbole,
 * le séparateur, l'espace avant le pourcent, la lettre de l'unité, l'ordinal du
 * jour. Une app dont on n'aurait traduit que les mots rendrait « 1 284,50 € »
 * sous une interface anglaise, et personne n'y verrait un bug tant qu'on ne
 * regarde que les phrases.
 */
describe('mise en forme anglaise', () => {
  beforeEach(async () => {
    await applyLocale('en')
  })

  it('place le symbole devant le montant, sans espace', () => {
    expect(formatMoney(money(128_450), 'EUR')).toBe('€1,284.50')
    expect(formatMoney(money(-4_290), 'EUR')).toBe('−€42.90')
  })

  it('sépare les décimales d’un point et les milliers d’une virgule', () => {
    const parts = moneyParts(money(128_450), 'EUR')
    expect(parts.integer).toBe('1,284')
    expect(parts.fraction).toBe('50')
    expect(decimalSeparator()).toBe('.')
    expect(symbolFirst()).toBe(true)
  })

  /* Le multiplicateur ne se pose pas du même côté dans les deux langues : le
     français multiplie l'unité — un kilo-euro, « 202 k€ » —, l'anglais multiplie
     le nombre, « €202k ». */
  it('écrit les montants arrondis à l’anglaise, multiplicateur compris', () => {
    expect(formatRoundedMoney(money(20_213_625), 'EUR')).toBe('€202k')
    expect(formatRoundedMoney(money(124_000_000), 'EUR')).toBe('€1.2M')
    expect(formatRoundedMoney(money(25_437), 'EUR')).toBe('€250')
    expect(formatRoundedMoney(money(-840_000), 'EUR')).toBe('−€8.4k')
  })

  it('colle le pourcent au chiffre', () => {
    expect(formatPercent(0.42)).toBe('42%')
    expect(formatDelta(-0.04)).toBe('−4%')
  })

  it('compte en bytes et non en octets', () => {
    expect(plain(formatBytes(512))).toBe('512 B')
    expect(plain(formatBytes(1_500_000))).toBe('1.5 MB')
  })

  it('dit les dates dans l’ordre jour-mois, sans « 1er »', () => {
    expect(formatDate('2026-07-01')).toBe('1 July 2026')
    expect(formatDate('2026-07-12')).toBe('12 July 2026')
    expect(formatYearMonth('2026-07')).toBe('July 2026')
  })

  /* « on the 5 of each month » se lit comme une faute : le gabarit reçoit donc
     un ordinal, que le français rend en chiffre nu. */
  it('ordonne le jour du mois, exceptions comprises', () => {
    expect(formatMonthDay(1)).toBe('1st')
    expect(formatMonthDay(2)).toBe('2nd')
    expect(formatMonthDay(3)).toBe('3rd')
    expect(formatMonthDay(4)).toBe('4th')
    expect(formatMonthDay(11)).toBe('11th')
    expect(formatMonthDay(12)).toBe('12th')
    expect(formatMonthDay(13)).toBe('13th')
    expect(formatMonthDay(21)).toBe('21st')
  })

  it('dit les jours relatifs dans sa langue', () => {
    expect(formatRelativeDays(0)).toBe('today')
    expect(formatRelativeDays(3)).toBe('in 3 days')
    expect(formatRelativeDays(-2)).toBe('2 days ago')
  })

  /* L'élision n'existe pas en anglais, mais la préposition reste : les gabarits
     des deux langues portent donc le complément sans elle. */
  it('remplace l’élision par une préposition', () => {
    expect(de('Alice')).toBe('of Alice')
    expect(de('Camille')).toBe('of Camille')
  })

  it('énumère avec « and »', () => {
    expect(enumerate(['Alix'])).toBe('Alix')
    expect(enumerate(['Alix', 'Camille'])).toBe('Alix and Camille')
    expect(enumerate(['Alix', 'Camille', 'Sacha'])).toBe('Alix, Camille and Sacha')
  })
})

describe('mise en forme française', () => {
  it('garde l’élision et l’énumération de sa langue', () => {
    expect(de('Alice')).toBe('d’Alice')
    expect(de('Camille')).toBe('de Camille')
    expect(de('Hugo')).toBe('d’Hugo')
    expect(enumerate(['Alix', 'Camille'])).toBe('Alix et Camille')
  })

  it('écrit le jour du mois en chiffre nu', () => {
    expect(formatMonthDay(1)).toBe('1')
    expect(formatMonthDay(21)).toBe('21')
  })

  it('écrit « 1er » en toutes lettres sur une date complète', () => {
    expect(formatDate('2026-07-01')).toBe('1er juillet 2026')
  })
})
