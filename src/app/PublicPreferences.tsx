import type { Locale, ThemeSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { ThemeDarkIcon, ThemeLightIcon, ThemeSystemIcon } from '@/ui/Icons'
import { Segmented } from '@/ui/Segmented'

/* Les deux langues, dans l'ordre où le réglage les propose, et chacune nommée
   dans la sienne — voir `t.language`, qui dit pourquoi. Ce nom reste le nom
   accessible du bouton ; ce qui s'affiche est son code, et le code est le même
   dans les deux catalogues. La table est celle de l'écran « Plus » : deux
   listes séparées finiraient par proposer deux choses. */
const languages = (): { value: Locale; label: string; short: string }[] => [
  { value: 'fr', label: t.language.fr, short: t.language.frShort },
  { value: 'en', label: t.language.en, short: t.language.enShort },
]

const themes = (): { value: ThemeSetting; label: string; short: React.JSX.Element }[] => [
  { value: 'light', label: t.theme.light, short: <ThemeLightIcon /> },
  { value: 'dark', label: t.theme.dark, short: <ThemeDarkIcon /> },
  { value: 'system', label: t.theme.system, short: <ThemeSystemIcon /> },
]

/**
 * La langue et le thème, avant que le foyer existe.
 *
 * Les deux réglages vivaient derrière l'app — la langue sur « Plus », le thème
 * sur « Apparence » —, c'est-à-dire **derrière la création d'un document**. Un
 * visiteur dont le navigateur est configuré en anglais lisait donc toute la
 * présentation et tout l'onboarding en anglais, sans aucun moyen d'en sortir :
 * la seule façon de changer de langue était de créer un foyer dans une langue
 * qu'on ne voulait pas, puis d'aller le corriger.
 *
 * Et ce n'est pas un cas de bord. La langue est **détectée** sur
 * `navigator.languages` (`i18n/locale.ts`), et une détection se trompe : un
 * francophone sur un système en anglais est banal. Le thème, lui, suit le
 * système par défaut, ce qui est le bon réglage par défaut — mais « par
 * défaut » n'est pas « pour toujours », et c'est le même écran qui doit pouvoir
 * le dire.
 *
 * **Deux réglages secondaires ne prennent pas la première position.** Ils l'ont
 * prise : cinq pilules à libellé plein ouvraient la page, remplissaient la
 * largeur d'un téléphone et se lisaient avant le nom du produit. L'œil d'un
 * visiteur doit faire « produit → promesse → explication → action », et il
 * faisait « réglages → produit → … ». Rien de ce qui est ici n'est le
 * job-to-be-done de la présentation ; ce qui est ici sert **celui qui est
 * arrivé au mauvais endroit du réglage**, et il faut qu'il le trouve, pas qu'on
 * le lui mette devant le titre.
 *
 * D'où la forme courte : « FR | EN » et trois glyphes, cinq carrés de 44px au
 * lieu de cinq pilules — environ 250px en tout, contre la largeur entière d'une
 * 320. La rangée reste en tête et à droite : celui qui lit dans la mauvaise
 * langue lit depuis le haut, et un réglage posé au bas d'une page de cette
 * longueur demanderait de la parcourir entière pour trouver comment ne pas
 * avoir à la parcourir.
 *
 * **Ce qui ne change pas, et c'est l'essentiel : le contrôle.** C'est le même
 * `Segmented` qu'à l'intérieur, dans sa densité courte — pas un menu, pas un
 * sélecteur replié. L'argument qui l'a mis là vaut toujours : on vient le
 * chercher *précisément parce qu'on ne lit pas* ce qui est affiché, et un
 * contrôle qui n'affiche que sa valeur courante demande de l'ouvrir pour savoir
 * ce qu'il propose. « EN » se reconnaît sans comprendre un mot de ce qui
 * l'entoure, exactement comme « English ».
 *
 * **Et « Système » reste une position**, pas un repli derrière un appui long.
 * Deux raisons, dont la seconde est dirimante. Un appui long ne s'annonce nulle
 * part et n'existe pas au clavier : ce serait ranger le mode le plus utile là
 * où personne ne le trouve. Surtout, c'est le **défaut** — donc l'état de la
 * quasi-totalité des visiteurs —, et une bascule à deux positions ne saurait
 * pas le montrer : ni le soleil ni la lune ne seraient allumés, ou l'un des
 * deux mentirait. Trois glyphes coûtent 44px de plus et disent l'état vrai.
 *
 * **Rien n'est enregistré pour autant.** `setLocale` et `setTheme` mirent leur
 * préférence en `localStorage` *avant* de toucher au document, et `mutate` ne
 * programme aucune écriture tant que le statut vaut « onboarding ». Changer de
 * langue sur la présentation ne crée donc pas de foyer — la garde qui l'empêche
 * est celle qui existait déjà, et c'est elle qui rend ce composant possible
 * sans exception nouvelle.
 *
 * La rangée passe à la ligne plutôt que de défiler, et n'en a plus guère
 * l'occasion : un `Segmented` porte son propre repli — c'est un groupe de
 * boutons radio, pas une liste qu'on parcourt.
 */
export function PublicPreferences() {
  const locale = useStore((s) => s.data.settings.locale)
  const theme = useStore((s) => s.data.settings.theme)
  const setLocale = useStore((s) => s.setLocale)
  const setTheme = useStore((s) => s.setTheme)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Segmented
        options={languages()}
        value={locale}
        onChange={setLocale}
        label={t.language.label}
        className="w-fit"
      />
      <Segmented
        options={themes()}
        value={theme}
        onChange={setTheme}
        label={t.theme.label}
        className="w-fit"
      />
    </div>
  )
}
