/* ============================================================================
 * Les écrans que « Plus » ouvre, réunis derrière un seul spécificateur.
 *
 * `app/Routes.tsx` les charge tous par ce module-ci, et donc dans un seul
 * morceau : ouvrir l'un d'eux amène les autres, et descendre vers les
 * catégories puis vers une famille n'attend plus le réseau à chaque pas. Un
 * `import()` par écran aurait produit sept morceaux dont six se chargent
 * toujours à la suite du premier.
 *
 * **Le dossier s'appelle encore `settings`, et ce n'est pas une prétention sur
 * l'architecture de l'information** : c'est une unité de chargement. Les
 * personnes et les catégories ne sont pas des réglages — c'est précisément
 * pourquoi « Plus » les range ailleurs —, mais elles voyagent avec l'apparence
 * et les données parce qu'aucune n'est sur le chemin du geste quotidien, qui
 * est d'ouvrir son mois et d'y saisir une ligne.
 *
 * Rien d'autre ne passe par ici : les composants s'importent entre eux par leur
 * fichier, comme partout ailleurs dans l'app.
 * ==========================================================================*/

export { AppearancePage } from './AppearancePage'
export { CategoriesPage } from './CategoriesPage'
export { CategoryNewPage, FamilyNewPage } from './CategoryForms'
export { DataPage } from './DataPage'
export { FamilyPage } from './FamilyPage'
export { MemberPage } from './MemberPage'
export { PeoplePage } from './PeoplePage'
export { StoragePage } from './StoragePage'
