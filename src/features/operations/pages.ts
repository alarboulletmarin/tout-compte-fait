/* ============================================================================
 * Les écrans qui écrivent une ligne, réunis derrière un seul spécificateur.
 *
 * Même patron que `features/settings/pages.ts` et `features/savings/pages.ts`,
 * et pour une raison voisine : ce sont des **écrans de saisie**, on n'y arrive
 * que par une action délibérée, et jamais au démarrage. Le premier écran d'une
 * visite est le mois, ou la présentation ; aucun de ces cinq n'y est.
 *
 * Ils voyagent **ensemble** parce qu'ils partagent l'essentiel de leur poids —
 * `operations/OperationForm` et son `useOperationForm`, que quatre d'entre eux
 * montent tel quel. Les découper un par un aurait produit cinq morceaux dont
 * quatre auraient retéléchargé le même formulaire, ou bien un morceau commun de
 * plus à aller chercher à chaque fois.
 *
 * Le dossier s'appelle `operations`, comme le formulaire qu'ils ont en commun :
 * c'est une unité de chargement, pas une prétention sur l'architecture de
 * l'information. La fiche d'une récurrence n'écrit rien par elle-même — elle
 * mène aux gestes qui écrivent —, mais elle partage ce formulaire et elle
 * s'ouvre du même geste que lui.
 *
 * **Ce que ça coûte, et quand.** Un aller-retour de réseau au premier appui sur
 * le « + » d'une visite, et rien ensuite : le service worker précache tous les
 * morceaux, si bien que la question ne se pose que la toute première fois, sur
 * un document qu'on vient à peine de créer. C'est le même raisonnement que pour
 * la revue (`app/Routes.tsx`), et la même mesure qui l'a emporté.
 *
 * Rien d'autre ne passe par ici : les composants s'importent entre eux par leur
 * fichier, comme partout ailleurs dans l'app.
 * ==========================================================================*/

export { AdvanceFormPage } from '../advances/AdvanceFormPage'
export { CreditFormPage } from '../credits/CreditFormPage'
export { EntryPage } from '../month/EntryPage'
export { RecurrenceDetailPage } from '../recurrences/RecurrenceDetailPage'
export { RecurrenceFormPage } from '../recurrences/RecurrenceFormPage'
