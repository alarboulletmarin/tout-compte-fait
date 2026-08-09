/* ============================================================================
 * La rangée qui dit **pour qui** les chiffres se lisent.
 *
 * Elle vivait dans `MonthHeader`, dont elle était la deuxième ligne, et elle en
 * sort parce qu'un écran sans mois en a besoin : la projection d'épargne se lit
 * au nom de quelqu'un — c'est la règle du cahier §4.6 bis — mais elle ne dépend
 * d'aucun mois, et lui poser l'en-tête entier aurait ajouté une navigation
 * mensuelle qui ne commande rien sur un horizon de dix ans.
 *
 * Le filtre reste **celui du store**, et il n'y en a pas d'autre : c'est lui qui
 * applique déjà le prorata des charges communes, et s'en donner un second, local
 * à un écran, referait ce calcul à côté du premier.
 * ==========================================================================*/

import { t } from '@/i18n/strings'
import { useMembers, useMonthFilter } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Chip } from '@/ui/Chip'

/**
 * Les trois lectures du mois : tout, le commun seul, ou une personne.
 *
 * « Commun » n'est pas le frère de « une personne » — c'est l'autre découpage
 * du même total (voir `MonthFilter`). Il vaut la peine d'être une pilule quand
 * même : le pot est ce qu'on regarde ensemble, et c'était le seul chiffre du
 * foyer qu'aucun tableau de bord ne savait isoler.
 *
 * Seules les personnes portent une pastille : c'est leur couleur, et elle ne
 * désigne qu'elles. En donner une au commun demandait l'accent, qui est bien sa
 * couleur ailleurs — mais une pilule active passe elle-même en accent, et la
 * pastille y disparaissait, exactement comme celle du premier membre avant
 * qu'il quitte le vert pomme.
 *
 * `personsOnly` retire les deux premières, et avec elles le filet qui les
 * séparait : c'est la lecture de l'épargne, qui n'a pas de version foyer —
 * « Commun » ne rendrait que des zéros, et « Tout le monde » rendrait pire, une
 * somme. Deux personnes qui ont 12 000 € et 8 000 € de côté n'ont pas
 * « 20 000 € » : elles ont deux comptes et deux décisions.
 */
export function MemberChips({ personsOnly = false }: { personsOnly?: boolean }) {
  const members = useMembers()
  const filter = useMonthFilter()
  const setFilter = useStore((s) => s.setFilter)
  if (members.length === 0) return null

  return (
    /* Une ligne qui défile, à bord perdu : le cadre de l'en-tête est annulé puis
       reposé sur la piste, pour que la première et la dernière pilule ne soient
       pas rognées et que la rangée file jusqu'au bord de l'écran. Les 4px de
       cadre vertical logent l'anneau de focus, et la marge négative les reprend
       pour que la hauteur du bandeau ne bouge pas. */
    <div
      className="filter-scroller -mx-4 -my-1 flex gap-2 px-4 py-1 md:-mx-8 md:px-8"
      role="group"
      aria-label={t.shell.filterByMember}
    >
      {!personsOnly && (
        <>
          <Chip
            className="shrink-0"
            active={filter.kind === 'all'}
            onClick={() => {
              setFilter({ kind: 'all' })
            }}
          >
            {t.shell.all}
          </Chip>
          {/* Le commun se propose dès le premier membre : seul, la vue du membre
              vaut « tout le monde » au centime, et le pot est justement la seule
              lecture qui distingue encore les charges du foyer de ses lignes à
              lui. */}
          <Chip
            className="shrink-0"
            active={filter.kind === 'common'}
            onClick={() => {
              setFilter({ kind: 'common' })
            }}
          >
            {t.shell.common}
          </Chip>
          {/* Les deux premières pilules n'ont pas de pastille parce qu'elles ne
              désignent personne — une pastille est la couleur de quelqu'un. Sans
              rien pour le dire, cette absence se lit comme un oubli ; le filet la
              rend voulue, et sépare les lectures des personnes.

              En `--text-muted` atténué, et non en `--border` : ce dernier vaut 8 %
              d'encre, calibré pour une bordure posée sur une surface. Le bandeau,
              lui, est sur le fond de page, où un trait d'un pixel à 8 % ne se voit
              pas — un séparateur qu'on ne distingue pas ne sépare rien. */}
          <span aria-hidden="true" className="my-auto h-5 w-px shrink-0 bg-muted opacity-40" />
        </>
      )}
      {members.map((member) => (
        <Chip
          key={member.id}
          className="shrink-0"
          color={member.color}
          active={filter.kind === 'member' && filter.memberId === member.id}
          onClick={() => {
            setFilter({ kind: 'member', memberId: member.id })
          }}
        >
          {member.name}
        </Chip>
      ))}
    </div>
  )
}
