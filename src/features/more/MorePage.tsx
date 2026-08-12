import { useId } from 'react'
import { VERSION } from '@/app/meta'
import {
  ABOUT_PATH,
  APPEARANCE_PATH,
  CATEGORIES_PATH,
  CREDITS_PATH,
  DATA_PATH,
  manageRoutes,
  PEOPLE_PATH,
  PROJECTION_PATH,
  RECURRENCES_PATH,
  SAVINGS_PATH,
  SPLIT_PATH,
  STORAGE_PATH,
} from '@/app/routes'
import type { Locale, PaletteSetting, ThemeSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { currencySymbol, tpl } from '@/i18n/format'
import { useCategories, useFamilies, useHouseholdName, useMembers } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Select } from '@/ui/Field'
import {
  CategoriesIcon,
  CurrencyIcon,
  DeviceIcon,
  ForecastIcon,
  InfoIcon,
  LanguageIcon,
  PeopleIcon,
  ThemeIcon,
  TransferIcon,
} from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { Segmented } from '@/ui/Segmented'

/**
 * Tout ce que la barre d'onglets ne peut pas porter, rangé par intention.
 *
 * Elle en portait cinq, et cette contrainte-là décidait de l'architecture : les
 * récurrences y tenaient un rang qu'on n'ouvre pas tous les jours, pendant que
 * l'épargne, la répartition et les crédits — trois écrans pleins, avec leurs
 * routes, leurs calculs et leurs états vides — n'avaient **aucune adresse dans
 * la navigation**. On n'y arrivait que par une tuile du mois, laquelle s'efface
 * quand elle n'a rien à montrer : un écran atteignable seulement quand on n'en
 * a pas besoin.
 *
 * **Quatre groupes, et non deux plus « Réglages ».** L'écran a d'abord rangé ce
 * qu'il porte en deux groupes, dont le second renvoyait à une page « Réglages »
 * qui contenait, elle, les personnes, les catégories, l'apparence, la devise, le
 * stockage, l'export/import et « à propos ». Sept destinations de six natures
 * différentes derrière un seul intitulé, et un intitulé qui ment sur deux
 * d'entre elles au moins : qui compose le foyer et sous quelles étiquettes on
 * range ne sont pas des réglages d'application, ce sont **la structure du
 * budget**. Les données non plus — sauvegarder n'est pas un goût.
 *
 * Le critère n'est donc pas « où peut-on ranger cette fonctionnalité ? » mais
 * « avec quelle intention vient-on ? », et il en sort cinq :
 *
 * - **Gérer** — ce qui décide de ce que le budget calcule au quotidien.
 * - **Simuler** — ce qu'on essaie sans rien engager, et qui ne lit aucune donnée.
 * - **Organiser** — qui y figure, et sous quelles étiquettes.
 * - **Données** — où elles vivent, et comment en sortir une copie.
 * - **Application** — ce qui ne touche qu'à la façon dont l'app se présente.
 *
 * Le cinquième est arrivé avec les projections, et il a coûté une discussion :
 * un groupe d'une rangée, alors que la colonne latérale refuse précisément un
 * titre au-dessus d'un lien unique. La différence est qu'il y sert *à la place*
 * du lien, quand ici il vit à côté de quatre autres titres — c'est lui qui dit
 * qu'on change de nature. Et « Simuler » plutôt que « Calculateurs », pour la
 * raison qui a fait tomber « Réglages » : les quatre autres nomment une
 * intention, pas une catégorie d'outil.
 *
 * L'écran gagne deux groupes et perd un cran : « Plus → Réglages → Catégories »
 * devient « Plus → Catégories ». Il est un peu plus long, et c'est le bon
 * échange sur un téléphone — des groupes qu'on comprend en les balayant valent
 * mieux qu'un écran court qui oblige à en ouvrir un autre pour savoir ce qu'il
 * contient.
 *
 * **Ce que les rangées disent, et ce qu'elles ne disent pas.** Pas un chiffre du
 * budget, pas une tuile accentuée, aucune synthèse : chaque écran d'arrivée dit
 * déjà le sien, et les répéter ici ferait un second tableau de bord à
 * maintenir, en retard d'une règle sur le premier. En revanche chaque rangée dit
 * **sa** valeur — « Maison · 3 membres », « 47 catégories · 12 familles »,
 * « Système · Classique » — ou, quand elle n'en a pas, une phrase : sur un écran
 * qui n'est qu'une liste de portes, un libellé seul demande d'ouvrir pour savoir
 * si c'était la bonne.
 *
 * **Et chaque rangée porte le glyphe de sa destination**, celui-là même que la
 * colonne latérale affiche à la souris. C'était le manque de cet écran sous
 * 1024px : la barre d'onglets ne porte que quatre repères, et tout ce qu'elle
 * range se lisait donc en texte seul, onze libellés à parcourir de haut en bas.
 * Le DS §9.2 demande qu'un concept garde le même glyphe partout — la colonne
 * l'appliquait, cet écran-ci ne l'appliquait pas. Le repère est atténué et le
 * chevron aussi : le libellé garde la ligne, les deux marques l'encadrent, et
 * elles ne disent pas la même chose — l'une *vers quoi*, l'autre *qu'on y va*.
 */

/* La phrase d'une rangée de « Gérer », par destination — indexée sur les
   constantes de chemin et non sur des URL recopiées : un test qui écrirait ses
   adresses à la main resterait vert le jour où l'app change les siennes, et
   cette table-ci deviendrait muette sans que rien ne le dise. Une destination
   absente ne porte pas de phrase, elle ne casse rien. */
const hints = (): Record<string, string> => ({
  [RECURRENCES_PATH]: t.nav.subscriptionsHint,
  [SAVINGS_PATH]: t.nav.savingsHint,
  [SPLIT_PATH]: t.nav.splitHint,
  [CREDITS_PATH]: t.nav.creditsHint,
})

const themeName = (): Record<ThemeSetting, string> => ({
  light: t.theme.light,
  dark: t.theme.dark,
  system: t.theme.system,
})

const paletteName = (): Record<PaletteSetting, string> => ({
  classique: t.palettes.classique,
  monochrome: t.palettes.monochrome,
  douce: t.palettes.douce,
  vive: t.palettes.vive,
  neutre: t.palettes.neutre,
  contrastee: t.palettes.contrastee,
})

/* Les devises des pays où l'on tient ses comptes en français, plus les deux
   qu'un foyer francophone croise le plus souvent. Une liste et non un champ
   libre : `Intl` accepte n'importe quelle chaîne de trois lettres et rend
   alors le code brut en guise de symbole — sur chaque montant de l'app, sans
   moyen de revenir autrement qu'en retrouvant ce même champ. */
const CURRENCIES = ['EUR', 'CHF', 'CAD', 'XPF', 'GBP', 'USD']

/**
 * L'apparence : une rangée qui dit sa valeur, et mène à sa vue.
 *
 * Le thème était réglable sur place, et l'argument tenait : trois positions, un
 * geste, l'enfouir d'un cran aurait coûté plus que la rangée qu'il occupait. Il
 * ne tient plus depuis qu'il y a deux réglages, dont un qui ne se choisit pas à
 * la lecture de son nom — six palettes se regardent avant de se prendre, et six
 * aperçus ne tiennent pas dans les 250px utiles d'une rangée à 320px. Le thème
 * suit la palette plutôt que de rester seul : les régler à deux endroits, dont
 * un sans aperçu, aurait été le pire des deux.
 *
 * La rangée dit la **préférence**, pas le thème résolu : « Système » est ce
 * qu'on a choisi, et l'afficher « Clair » ferait croire à un réglage figé.
 */
function AppearanceRow() {
  const theme = useStore((s) => s.data.settings.theme)
  const palette = useStore((s) => s.data.settings.palette)

  return (
    <Row
      label={t.appearance.title}
      icon={ThemeIcon}
      description={tpl(t.settings.appearanceSummary, themeName()[theme], paletteName()[palette])}
      to={APPEARANCE_PATH}
    />
  )
}

/* Les deux langues, dans l'ordre où le réglage les propose. Chacune se nomme
   dans la sienne — voir `t.language`, qui dit pourquoi. */
const languages = (): { value: Locale; label: string }[] => [
  { value: 'fr', label: t.language.fr },
  { value: 'en', label: t.language.en },
]

/**
 * La langue, sur une rangée, à côté de la devise.
 *
 * **Ici et non sur l'écran d'apparence**, alors que c'en est un voisin évident :
 * l'apparence se choisit sur aperçu — six vignettes qu'il faut voir —, la langue
 * se choisit sur un mot qu'on reconnaît. Elle a en commun avec la devise d'être
 * un réglage à réponse fermée qui ne montre rien : les deux se règlent donc sur
 * place, dans le groupe qui les porte déjà.
 *
 * **Un `Segmented` et non un `Select`**, contrairement à la devise juste en
 * dessous, et la raison n'est pas la longueur de la liste : on vient ici
 * *précisément parce qu'on ne lit pas* ce qui est affiché. Les deux positions
 * sont visibles sans ouvrir quoi que ce soit, et « English » se reconnaît sans
 * comprendre un mot de ce qui l'entoure — ce qu'un sélecteur replié, qui
 * n'affiche que la langue courante, ne permet pas.
 */
function LanguageRow() {
  const locale = useStore((s) => s.data.settings.locale)
  const setLocale = useStore((s) => s.setLocale)

  return (
    <Row
      label={t.language.label}
      icon={LanguageIcon}
      description={t.language.hint}
      trailing={
        <Segmented
          options={languages()}
          value={locale}
          onChange={setLocale}
          label={t.language.label}
          className="w-fit"
        />
      }
    />
  )
}

/**
 * La devise, sur une rangée — et le seul réglage qui se fasse encore sur place.
 *
 * Le sélecteur natif reste le contrôle : sur un téléphone il ouvre la roue du
 * système, qui est ce qu'on sait manipuler à une main, et il n'ajoute ni
 * composant ni dépendance pour six choix. Six codes n'ont d'ailleurs rien à
 * montrer qu'une vue rendrait mieux — c'est l'argument inverse de celui qui a
 * envoyé les palettes dans la leur.
 *
 * Le sélecteur est enveloppé dans une boîte qui ne se rétracte pas, ce qui lui
 * donne la largeur de sa plus longue option : `w-full`, qu'il porte comme tous
 * les contrôles, vaudrait ici toute la rangée et repousserait l'étiquette.
 */
function CurrencyRow() {
  const currency = useStore((s) => s.data.settings.currency)
  const setCurrency = useStore((s) => s.setCurrency)
  const id = useId()

  return (
    <Row
      label={t.settings.currency}
      labelFor={id}
      icon={CurrencyIcon}
      description={t.settings.currencyHint}
      trailing={
        <Select
          id={id}
          value={currency}
          onChange={(event) => {
            setCurrency(event.target.value)
          }}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {`${code} · ${currencySymbol(code)}`}
            </option>
          ))}
        </Select>
      }
    />
  )
}

export function MorePage() {
  const name = useHouseholdName()
  const members = useMembers()
  const families = useFamilies()
  const categories = useCategories()

  /* Le nom est facultatif — il ne se demande plus au premier lancement. Sans
     lui, la rangée dit ce qu'elle a à dire et rien de plus : « Maison · » suivi
     d'un vide se lirait comme un foyer sans nom plutôt que comme un foyer qui
     n'en veut pas. */
  const people =
    members.length === 0
      ? t.settings.membersNone
      : tpl(
          members.length > 1 ? t.settings.membersCount : t.settings.membersCountOne,
          members.length,
        )
  const household = name.trim() === '' ? people : `${name.trim()} · ${people}`

  const catalogue = [
    tpl(
      categories.length > 1 ? t.settings.familyCount : t.settings.familyCountOne,
      categories.length,
    ),
    tpl(
      families.length > 1 ? t.settings.familiesCount : t.settings.familiesCountOne,
      families.length,
    ),
  ].join(' · ')

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title={t.nav.more} />

      {/* Cinq groupes sur deux colonnes au-delà de 768px, un seul en dessous.
          L'écran est un index de destinations : il ne se lit pas, il se
          balaie, et sur un desktop la colonne unique en cachait la moitié sous
          la ligne de flottaison pendant qu'un tiers de la fenêtre restait vide
          à droite. Deux colonnes le rendent d'un coup d'œil.

          L'ordre des groupes reste celui du DOM, et donc celui de la lecture au
          clavier comme au lecteur d'écran : la grille les range de gauche à
          droite puis de haut en bas, sans rien réordonner. C'est ce qui
          interdisait de composer deux piles à la main pour égaliser leurs
          hauteurs — ça se lirait en colonnes, et « Simuler » passerait avant
          « Gérer » pour une raison qui n'est pas la sienne. Les hauteurs sont
          donc inégales, et le blanc sous un groupe court est le prix de
          l'ordre. */}
      <div className="cols">
        {/* Ce qu'on tient, par opposition aux trois lectures que la barre porte.
            Les quatre destinations viennent de `manageRoutes()`, que la colonne
            latérale déplie par la même table : deux navigations qui liraient deux
            listes finiraient par diverger sans que rien ne l'annonce. */}
        <RowGroup title={t.nav.manage}>
          {manageRoutes().map((route) => {
            const hint = hints()[route.path]
            return (
              <Row
                key={route.path}
                label={route.label}
                icon={route.icon}
                to={route.path}
                {...(hint === undefined ? {} : { description: hint })}
              />
            )
          })}
        </RowGroup>

        {/* Le seul groupe dont le contenu ne décrit pas le foyer : on n'y lit
            rien de ses données, on y essaie un chiffre. Il vient juste après
            « Gérer » parce qu'il en est le prolongement — on tient un budget,
            puis on se demande ce qu'il donne au bout de dix ans — et avant
            « Organiser », qui parle de la structure et non des montants.

            Un groupe d'une seule rangée, et c'est assumé : la doctrine de la
            colonne latérale refuse un titre au-dessus d'un lien unique, mais elle
            le refuse là où le titre serait *à la place* du lien. Ici il est à
            côté de quatre autres titres, dans un écran qui se parcourt à l'œil, et
            c'est lui qui dit qu'on change de nature — sans quoi « Projections »
            tomberait sous « Gérer », où elle prétendrait décider de quelque
            chose. */}
        <RowGroup title={t.nav.simulate}>
          <Row
            label={t.nav.projections}
            icon={ForecastIcon}
            description={t.nav.projectionsHint}
            to={PROJECTION_PATH}
          />
        </RowGroup>

        {/* La structure du budget, et non des réglages : on n'ouvre pas ces deux
            vues pour changer l'app, on les ouvre parce que quelqu'un est arrivé
            dans le foyer ou parce qu'une dépense n'a pas d'étiquette où aller. */}
        <RowGroup title={t.nav.organise}>
          <Row
            label={t.settings.household}
            icon={PeopleIcon}
            description={household}
            to={PEOPLE_PATH}
          />
          <Row
            label={t.settings.categories}
            icon={CategoriesIcon}
            description={catalogue}
            to={CATEGORIES_PATH}
          />
        </RowGroup>

        {/* « Sur cet appareil » avant « Exporter / importer » : la première dit
            où les données vivent, la seconde comment les en faire sortir. */}
        <RowGroup title={t.nav.data}>
          <Row
            label={t.storage.title}
            icon={DeviceIcon}
            description={t.settings.storageSummary}
            to={STORAGE_PATH}
          />
          <Row
            label={t.settings.transfer}
            icon={TransferIcon}
            description={t.settings.transferSummary}
            to={DATA_PATH}
          />
        </RowGroup>

        {/* Les vrais réglages, ceux qui ne touchent qu'à la présentation — plus la
            page qui dit ce qu'est cette app. « À propos » est ici parce que sous
            1024px c'est sa seule porte : la barre d'onglets ne peut pas en porter
            une cinquième, et la colonne, elle, a son propre lien en pied. */}
        <RowGroup title={t.nav.application}>
          <AppearanceRow />
          <LanguageRow />
          <CurrencyRow />
          <Row
            label={t.nav.about}
            icon={InfoIcon}
            description={tpl(t.settings.aboutSummary, VERSION)}
            to={ABOUT_PATH}
          />
        </RowGroup>
      </div>
    </div>
  )
}
