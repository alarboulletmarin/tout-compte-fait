import type { Locale, ThemeSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { Segmented } from '@/ui/Segmented'

/* Les deux langues, dans l'ordre où le réglage les propose, et chacune nommée
   dans la sienne — voir `t.language`, qui dit pourquoi. La table est celle de
   l'écran « Plus » : deux listes séparées finiraient par proposer deux choses. */
const languages = (): { value: Locale; label: string }[] => [
  { value: 'fr', label: t.language.fr },
  { value: 'en', label: t.language.en },
]

const themes = (): { value: ThemeSetting; label: string }[] => [
  { value: 'light', label: t.theme.light },
  { value: 'dark', label: t.theme.dark },
  { value: 'system', label: t.theme.system },
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
 * **Les mêmes contrôles qu'à l'intérieur**, et pas une variante compacte : un
 * concept garde sa forme partout (DS §6). Le `Segmented` de la langue est
 * exactement celui de « Plus », celui du thème exactement celui d'« Apparence ».
 * L'argument qui les y a mis vaut ici plus encore : on vient les chercher
 * *précisément parce qu'on ne lit pas* ce qui est affiché, et « English » se
 * reconnaît sans comprendre un mot de ce qui l'entoure — ce qu'un sélecteur
 * replié, qui n'affiche que la valeur courante, ne permet pas.
 *
 * **Rien n'est enregistré pour autant.** `setLocale` et `setTheme` mirent leur
 * préférence en `localStorage` *avant* de toucher au document, et `mutate` ne
 * programme aucune écriture tant que le statut vaut « onboarding ». Changer de
 * langue sur la présentation ne crée donc pas de foyer — la garde qui l'empêche
 * est celle qui existait déjà, et c'est elle qui rend ce composant possible
 * sans exception nouvelle.
 *
 * La rangée passe à la ligne plutôt que de défiler : cinq positions à 320px ne
 * tiennent pas côte à côte, et un `Segmented` porte son propre repli — c'est un
 * groupe de boutons radio, pas une liste qu'on parcourt.
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
