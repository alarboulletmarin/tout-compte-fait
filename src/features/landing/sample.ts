import { money, neg } from '@/domain/money'

/**
 * Les chiffres de la présentation. En dur, et non tirés de
 * `persistence/example.ts` : ce module vaut une vingtaine de kilo-octets qu'on
 * charge à la demande précisément pour que le démarrage ne les porte pas — et
 * la présentation *est* le démarrage. Une poignée de montants n'en valent pas
 * le prix.
 *
 * Ils décrivent un foyer cohérent, et pas des valeurs prises au hasard. **Tout
 * se recompose, d'un bout à l'autre de la page** — c'est la seule contrainte
 * de ce fichier, et elle est devenue exigeante le jour où la page a cessé de
 * montrer une grille pour montrer aussi le calcul qui la produit :
 *
 * - le mois prévu vaut les charges plus les crédits : 1 820 + 740 = 2 560 ;
 * - la capacité d'épargne est ce qui reste avant versement :
 *   3 200 − 1 820 − 740 = 640, et c'est la cascade qu'affiche `LandingProof` ;
 * - les revenus des deux membres font le revenu du foyer :
 *   1 984 + 1 216 = 3 200, et leurs parts en sont le prorata exact —
 *   1 984 ÷ 3 200 = 62 %, 1 216 ÷ 3 200 = 38 % ;
 * - leurs parts du pot commun le redonnent au centime :
 *   520,80 + 319,20 = 840 ;
 * - et le report s'annule d'un membre à l'autre, si bien que la somme des
 *   versements vaut encore 840 : c'est exactement ce que `t.split.checkHint`
 *   promet sur le vrai écran, et le montrer vaut mieux que l'affirmer.
 *
 * Une grille dont les chiffres ne se recomposent pas se lit comme une erreur —
 * c'est vrai du vrai tableau de bord, ça l'est encore plus de celui qui sert à
 * le présenter.
 *
 * `landing.sample` le dit sous la grille, en toutes lettres : ces chiffres sont
 * ceux d'un exemple. Un écran de démonstration qui ne se déclare pas est un
 * écran qui ment.
 */

/** Ce qu'une seule personne a réglé le mois dernier, et qui se rattrape ici. */
const ADVANCED = money(12_000)

/**
 * La part du report qui change de poche : celui qui a avancé porte déjà sa
 * propre part, il ne récupère donc que celle de l'autre — 38 % de 120 €.
 * Écrit une fois et repris avec les deux signes, parce que la vérification à
 * zéro n'est vraie que si c'est le même chiffre des deux côtés.
 */
const ADJUSTMENT = money(4_560)

export const SAMPLE = {
  /** Confirmé sur prévu — la jauge de l'anneau, et le chiffre en son centre. */
  monthConfirmed: money(192_000),
  monthForecast: money(256_000),
  monthRatio: 0.75,

  /**
   * Deux membres, deux parts au prorata des revenus. Elles font 100 — l'anneau
   * de la vraie tuile Répartition découpe des parts, pas une jauge, et deux
   * segments qui ne feraient pas le tour laisseraient un arc vide sans nom.
   *
   * `income`, `due` et `adjustment` ne servent qu'à `LandingProof` : la grille
   * bento n'en montre aucun, et c'est bien le reproche auquel cette page
   * répond — le prorata s'y lisait en pourcentage sans qu'on voie jamais d'où
   * il sort ni ce qu'il donne à verser.
   */
  shares: [
    {
      id: 'a',
      label: 'Alix',
      percent: 62,
      color: 'var(--member-1)',
      income: money(198_400),
      due: money(52_080),
      /* Alix a avancé : le mois suivant lui rend la part de Camille. */
      adjustment: neg(ADJUSTMENT),
    },
    {
      id: 'b',
      label: 'Camille',
      percent: 38,
      color: 'var(--member-2)',
      income: money(121_600),
      due: money(31_920),
      adjustment: ADJUSTMENT,
    },
  ],
  /** Le total au centre de l'anneau, comme `SplitTile` le pose. */
  shared: money(84_000),
  advanced: ADVANCED,

  income: money(320_000),
  /** Les deux termes que la capacité soustrait du revenu, dans cet ordre. */
  charges: money(182_000),
  debtMonthly: money(74_000),
  savingCapacity: money(64_000),
  /* Dérivé de l'échéancier sur le vrai écran, et sans rapport arithmétique
     avec la mensualité ci-dessus : les intérêts passent par là. Rien ne le
     recompose donc, et rien ne le prétend. */
  debtRemaining: money(8_742_000),
} as const
