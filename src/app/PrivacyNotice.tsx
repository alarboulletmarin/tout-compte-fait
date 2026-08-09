import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { t } from '@/i18n/strings'
import { hasReadNotice, markNoticeRead } from '@/lib/notice'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { Checkbox } from '@/ui/Field'
import { Sheet } from '@/ui/Sheet'
import { LINK } from './AppFooter'
import { legalRoutes, PRIVACY_PATH, styleguideRoute } from './routes'

/**
 * La promesse de ne rien collecter, devant qui n'a pas l'intention de la lire.
 *
 * Elle est écrite quatre fois ailleurs : sur la présentation, à la dernière
 * étape de l'onboarding, sur « à propos », et en détail sur
 * `/confidentialite`. Toutes se lisent, et c'est précisément le problème :
 * quelqu'un qui arrive méfiant devant une app de finances saisit ses revenus
 * sans en avoir croisé une ligne. La promesse était partout sauf devant lui.
 *
 * **C'est un bandeau cookies retourné**, et la forme est empruntée exprès. Là
 * où l'un fait accepter ce qui est pris, celle-ci dit ce qui n'est pas pris.
 * Elle bloque pour la seule raison qui rend un bandeau cookies efficace : c'est
 * la forme qu'on ne peut pas ne pas voir. Ni croix, ni Échap, ni clic sur le
 * fond : un seul bouton, nommé.
 *
 * **La case est là pour qu'on lise, pas pour qu'on réponde.** Rien n'est
 * enregistré de ce qu'elle vaut : elle allume le bouton, et c'est tout ce
 * qu'elle fait. C'est ce qui distingue cette modale d'une question, et ce qui
 * la réconcilie avec le « rien à configurer pour démarrer » du cahier §1 : elle
 * ne configure rien et ne demande aucune information sur qui la lit. Le nom du
 * foyer, lui, reste supprimé pour la raison inverse : il exigeait une réponse
 * *sur soi* pour une décoration (§4.1).
 *
 * Elle vit **en fin de corps et non dans le pied**, où elle a d'abord été
 * posée : le pied est hors du défilement, donc sur un téléphone de 320 on
 * cochait « J'ai lu » sans avoir fait défiler une seule des quatre lignes. Une
 * case qui atteste de ce qu'on n'a pas pu lire ne vaut rien. Le DS §6 dit par
 * ailleurs de la légende du pied qu'elle « est pour l'œil, elle n'est reliée à
 * rien », ce qu'un contrôle ne peut pas être.
 *
 * **Échap inerte n'est pas un piège au sens de WCAG 2.1.2.** Le piège de focus
 * reste celui du navigateur, la case répond à la barre d'espace et le bouton à
 * Entrée : la sortie existe au clavier, elle est simplement nommée. Le focus
 * d'entrée, lui, va sur la boîte et non sur son premier lien, sans quoi un
 * lecteur d'écran annoncerait le nom du lien à la place de la description que
 * `describedBy` pose (voir `Sheet`).
 *
 * **Trois familles d'écrans ne la reçoivent pas**, et aucune n'est une
 * exception de confort :
 *
 * - **Les trois pages juridiques**, parce qu'elle y mène. Son lien est la seule
 *   chose qu'elle donne à vérifier, et la modale recouvrait la page qu'il vient
 *   d'ouvrir : on ne voyait rien se passer, donc le lien passait pour cassé.
 *   Elle revient en repartant, décochée : le drapeau n'est pas écrit, et lire la
 *   politique n'est pas la même chose que dire qu'on l'a lue.
 * - **Le nuancier**, qui n'est pas un écran de l'app : `App.tsx` le dit d'une
 *   route de développement que « personne n'ouvre depuis l'app », et le pied de
 *   page refuse de le lier. C'est aussi le seul écran où une surcouche globale
 *   nuit vraiment, puisqu'il existe pour inspecter les composants, celui-ci
 *   compris.
 * - **Un document qui ne s'ouvre pas.** L'écran d'arrivée porte alors les quatre
 *   recours du cahier §5, et retarder un sauvetage de données pour une formalité
 *   serait le pire moment de toute l'app pour bloquer. Le drapeau ne s'écrit pas
 *   non plus : elle est due, elle est seulement remise.
 *
 * **Le drapeau se lit au premier rendu**, pas dans un effet : le document vit en
 * IndexedDB (asynchrone), la notice doit répondre avant lui, et `localStorage`
 * est synchrone. Elle s'affiche donc aussi chez qui utilise déjà l'app, une
 * fois, ce qui est le comportement voulu : la position de l'app vaut d'être
 * annoncée à ceux qui s'en servent déjà.
 */
export function PrivacyNotice() {
  /* Deux états et non un seul, parce qu'ils ne disent pas la même chose : ce
     qu'on savait au montage, et ce que ce chargement-ci a fait. Le premier est
     figé, par un initialiseur, donc une seule lecture de `localStorage`, et c'est
     lui qui décide s'il y a quelque chose à monter ; le second referme la
     feuille en la laissant en place, sans quoi l'animation de sortie de `.sheet`
     n'aurait plus de nœud à animer et le bouton escamoterait la modale d'un
     coup. */
  const [seen] = useState(hasReadNotice)
  const [done, setDone] = useState(false)
  const [read, setRead] = useState(false)
  const bodyId = useId()

  const { pathname } = useLocation()
  /* Une lecture synchrone, fausse au premier rendu comme toute lecture du store
     avant l'hydratation : c'est exactement ce qu'il faut ici, rien ne se retarde,
     et l'échec, quand il arrive, arrive avec l'écran qui le porte. */
  const failing = useStore((s) => s.error !== null)

  const elsewhere =
    pathname === styleguideRoute().path || legalRoutes().some((route) => route.path === pathname)

  /* Rien du tout, et non une feuille refermée : elle n'a jamais été là chez qui
     l'a déjà lue, donc il n'y a aucune sortie à animer. */
  if (seen) return null

  return (
    <Sheet
      open={!done && !elsewhere && !failing}
      /* Elle ne se referme pas, donc `onClose` n'a rien à faire ; mais la prop
         est requise, et lui donner le bouton reviendrait à écrire une sortie que
         `dismissible={false}` vient justement de retirer. */
      onClose={() => {}}
      dismissible={false}
      describedBy={bodyId}
      title={t.notice.title}
      footer={
        <Button
          full
          disabled={!read}
          onClick={() => {
            markNoticeRead()
            setDone(true)
          }}
        >
          {t.notice.action}
        </Button>
      }
    >
      <div id={bodyId} className="flex flex-col gap-4">
        <p className="t-body">{t.notice.lead}</p>

        {/* Une vraie liste, et non quatre paragraphes : c'est un décompte de
            quatre choses qui n'existent pas, et un lecteur d'écran doit pouvoir
            l'annoncer comme tel plutôt que comme de la prose. Les puces sont
            retirées au profit du filet de gauche : quatre lignes qui commencent
            toutes par « Aucun » n'ont pas besoin qu'on répète le marqueur
            devant. */}
        <ul className="flex list-none flex-col gap-2 border-l border-border pl-4">
          {[
            t.notice.noAccount,
            t.notice.noTracking,
            t.notice.noServer,
            t.notice.noReader,
          ].map((claim) => (
            <li key={claim} className="t-body">
              {claim}
            </li>
          ))}
        </ul>

        {/* La ligne qui rend les quatre autres vérifiables, et son lien. Sans
            elle, la notice demande de la croire sur parole, ce qu'elle existe
            précisément pour éviter. Le détail de ce qui est enregistré vit sur
            la page, y compris la seule trace qui existe vraiment : les journaux
            de l'hébergeur, qu'aucune des quatre lignes ne prétend nier. */}
        <div className="flex flex-col gap-1">
          <p className="t-label">{t.notice.verify}</p>
          <Link to={PRIVACY_PATH} className={LINK}>
            {t.legal.privacy}
          </Link>
        </div>

        {/* Dernière chose du corps, donc derrière ce qu'elle atteste, et séparée
            d'un filet : ce n'est plus de la lecture, c'est le geste. */}
        <Checkbox
          className="border-t border-border pt-3"
          checked={read}
          onChange={setRead}
          label={t.notice.check}
          /* L'aide reste affichée après la coche : le DS §6 le demande de ce qui
             informe de ce qui va se passer, et la faire disparaître au moment où
             l'on comprend enfin le lien entre la case et le bouton reviendrait à
             effacer l'explication au profit de qui n'en a plus besoin. */
          hint={t.notice.checkHint}
        />
      </div>
    </Sheet>
  )
}
