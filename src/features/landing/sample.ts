import { money } from '@/domain/money'

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
 * - et ce qu'une seule personne a avancé se déduit de son virement, si bien
 *   que la somme des versements vaut le pot moins l'avance :
 *   (520,80 − 120) + 319,20 = 720 = 840 − 120. C'est exactement ce que
 *   `t.split.checkTransfersHint` promet sur le vrai écran, et le montrer vaut
 *   mieux que l'affirmer.
 *
 * Une grille dont les chiffres ne se recomposent pas se lit comme une erreur —
 * c'est vrai du vrai tableau de bord, ça l'est encore plus de celui qui sert à
 * le présenter.
 *
 * `landing.sample` le dit sous la grille, en toutes lettres : ces chiffres sont
 * ceux d'un exemple. Un écran de démonstration qui ne se déclare pas est un
 * écran qui ment.
 */

/** Ce qu'une seule personne a déjà réglé ce mois-ci, déduit de son virement. */
const ADVANCED = money(12_000)

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
   * `income`, `due` et `advanced` ne servent qu'à `LandingProof` : la grille
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
      /* Alix a réglé les 120 € elle-même : ils se déduisent de son virement. */
      advanced: ADVANCED,
    },
    {
      id: 'b',
      label: 'Camille',
      percent: 38,
      color: 'var(--member-2)',
      income: money(121_600),
      due: money(31_920),
      advanced: money(0),
    },
  ],
  /** Le total au centre de l'anneau, comme `SplitTile` le pose. */
  shared: money(84_000),
  advanced: ADVANCED,

  /**
   * Le solde attendu en fin de mois : le revenu moins tout ce qui est prévu.
   * 3 200 − 2 560 = 640. Il vaut la capacité d'épargne au centime, et ce n'est
   * pas une coïncidence : ce foyer n'a aucun versement d'épargne, donc les deux
   * soustractions retirent exactement les mêmes termes. Écrit à part quand
   * même, parce que les deux chiffres cesseraient d'être égaux dès qu'une ligne
   * d'épargne entrerait dans l'exemple, et qu'un alias le cacherait.
   */
  forecast: money(64_000),

  /**
   * La ligne que la tuile du mécanisme montre : prévue à 96,40, tombée à
   * 104,20. Elle fait partie des 1 820 € de charges — c'est une des lignes du
   * mois, pas un chiffre posé à côté —, et rien d'autre de la page ne s'y
   * recompose : une seule ligne sur une trentaine ne se déduit d'aucun total.
   */
  electricityPlanned: money(9_640),
  electricityReal: money(10_420),

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
