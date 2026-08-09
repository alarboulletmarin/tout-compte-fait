/* ============================================================================
 * Les écrans de l'épargne qui ne sont pas sur le chemin quotidien.
 *
 * La page Épargne, elle, reste dans le bundle initial : elle s'atteint d'un
 * geste depuis la tuile Capacité du tableau de bord, comme la Répartition ou
 * les Crédits. Ce qui s'ouvre **sous** elle — la fiche d'un support, ses deux
 * formulaires, la courbe de son historique — se demande, et n'a donc aucune
 * raison de peser sur le premier chargement de tout le monde.
 *
 * Un seul module pour tous, comme les réglages : ouvrir une fiche amène aussi
 * ses formulaires, et c'est exactement l'usage — on relève une valeur depuis la
 * fiche qu'on vient d'ouvrir. Autant d'`import()` séparés auraient fait autant
 * d'allers-retours de réseau là où l'on fait justement des allers-retours.
 * ==========================================================================*/

export { SupportPage } from './SupportPage'
export { SupportFormPage } from './SupportFormPage'
export { RateFormPage } from './RateFormPage'
export { ValuationFormPage } from './ValuationFormPage'
export { ValuationsFormPage } from './ValuationsFormPage'
/* La gestion complète des supports et l'analyse de leur évolution : deux
   sous-vues qu'on descend chercher, pas le chemin quotidien de la tuile
   Capacité du mois — voir `SavingsPage`, qui n'en garde qu'un aperçu. */
export { SupportsPage } from './SupportsPage'
export { AnalysisPage } from './AnalysisPage'
