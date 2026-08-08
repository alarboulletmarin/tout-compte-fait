/* ============================================================================
 * Les trois textes juridiques, et le seul endroit où ils s'écrivent.
 *
 * **Pourquoi pas dans `fr.ts`.** C'est l'exception, et elle a une raison
 * mesurable : `fr.ts` est importé par presque tous les composants, donc il vit
 * dans le graphe initial, que `scripts/size.mjs` plafonne à 200 Kio. Ces trois
 * pages pèsent plusieurs kilo-octets de prose que personne ne lit au quotidien.
 * Elles voyagent donc avec les écrans qui les rendent, chargés à la demande.
 *
 * La forme est volontairement pauvre — un titre, un préambule, des sections de
 * paragraphes — parce qu'une page juridique n'a rien à faire de plus, et parce
 * qu'un composant générique se relit plus vite que trois écrans qui se
 * ressemblent à quelques balises près.
 *
 * Le ton est celui du reste de l'app : on dit ce qui se passe, pas « la Société
 * met en œuvre les moyens ». Un texte juridique que personne ne lit ne protège
 * personne — c'est déjà l'argument des questions de confirmation (cahier §4.8).
 * ==========================================================================*/

import {
  legalNotice as enNotice,
  privacyPolicy as enPrivacy,
  terms as enTerms,
} from './legal.en'
import { HOST, PUBLISHER } from './parties'
import { currentLocale, subscribeLocale } from './strings'

export { HOST, PUBLISHER } from './parties'

export type LegalSection = {
  heading: string
  /** Un paragraphe par entrée. Aucune mise en forme : c'est de la prose. */
  body: string[]
}

/* Sans titre : il est dans la table des routes (`app/routes.ts`), qui le donne
   au pied de page comme à l'en-tête de l'écran. Le poser ici aussi en aurait
   fait deux mots différents au premier changement d'avis. */
export type LegalDocument = {
  /** La phrase qui répond avant qu'on ait lu le reste. */
  intro: string
  sections: LegalSection[]
  /** Ce qui date le document : une page juridique sans date ne s'oppose à rien. */
  updated: string
}

const UPDATED = 'août 2026'

const frNotice: LegalDocument = {
  intro:
    'Qui édite ce site, qui l’héberge, et sous quelles licences il est publié. Ces informations sont obligatoires : l’article 1-1 de la LCEN — l’ancien article 6 III, déplacé par la loi du 21 mai 2024 — impose à tout éditeur de se rendre identifiable.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Éditeur',
      body: [
        `${PUBLISHER.name}, personne physique agissant à titre non professionnel. Tout compte fait est un projet personnel, gratuit, sans activité commerciale : ni publicité, ni abonnement, ni revente de quoi que ce soit — il n’y a d’ailleurs rien à revendre, puisqu’aucune donnée ne quitte ton appareil.`,
        'Directeur de la publication : la même personne.',
      ],
    },
    {
      heading: 'Joindre l’éditeur',
      body: [
        'Le dépôt de code est le point de contact : une issue publique pour un bug, une question ou une demande, et le signalement privé de GitHub pour une faille de sécurité ou pour toute demande qui n’a pas à être publique.',
        'Le lien est en bas de cette page, et sur l’écran « à propos ».',
      ],
    },
    {
      heading: 'Hébergeur',
      body: [
        `${HOST.name} — ${HOST.address}, États-Unis — ${HOST.phone} — ${HOST.url}`,
        'Le site est servi depuis l’infrastructure de cet hébergeur. Il n’y a aucun autre serveur : l’app est un ensemble de fichiers statiques, et tout le calcul se fait dans ton navigateur.',
      ],
    },
    {
      heading: 'Nom de domaine',
      body: [`${PUBLISHER.domain}, enregistré par l’éditeur.`],
    },
    {
      heading: 'Code et licences',
      body: [
        'Le code de Tout compte fait est publié sous licence GNU Affero General Public License, version 3 ou ultérieure : il peut être lu, copié, modifié, redistribué et hébergé, y compris pour un usage commercial. La contrepartie est que toute version modifiée doit être publiée sous la même licence — et l’article 13 le demande dès la mise en ligne, sans qu’il faille distribuer quoi que ce soit. Le texte complet est dans le dépôt, dont le lien est en bas de cette page.',
        'Les versions publiées avant celle-ci l’ont été sous licence MIT et le restent : le changement de licence ne vaut que pour la suite.',
        'L’app embarque des composants tiers qui portent leurs propres licences — six sous MIT, un sous ISC, et deux fontes sous SIL Open Font License 1.1, qui exige d’être distribuée avec elles. Leurs notices intégrales sont servies avec l’app, et le lien est en bas de cette page.',
      ],
    },
    {
      heading: 'Ce que ce site n’est pas',
      body: [
        'Tout compte fait n’est pas un établissement bancaire ni un prestataire de services de paiement. Aucun compte bancaire n’y est relié, aucun relevé n’y est lu, aucune opération n’y est exécutée : l’app calcule sur les chiffres que tu saisis, et rien d’autre. Elle ne relève à ce titre d’aucun agrément.',
      ],
    },
  ],
}

const frPrivacy: LegalDocument = {
  intro:
    'Tes données ne quittent pas ton appareil. Ni l’éditeur, ni l’hébergeur, ni personne d’autre ne peut les lire — il n’existe aucun serveur où elles pourraient se trouver.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Ce que l’app enregistre, et où',
      body: [
        'Tout ce que tu saisis — personnes, catégories, récurrences, entrées, crédits, avances — est enregistré dans la base IndexedDB de ton navigateur, sur ton appareil. C’est le seul endroit où ces informations existent.',
        'S’y ajoutent cinq réglages minuscules, dans le stockage local du même navigateur : le thème choisi, la palette choisie, la date de ton dernier export, la date à laquelle tu as écarté le rappel d’export, et le fait que tu as fermé la notice du premier lancement. Ils décrivent cet appareil-ci, et c’est pourquoi ils ne figurent pas dans un fichier exporté.',
        'Rien de tout cela n’est transmis. L’app ne fait aucune requête réseau vers un tiers : elle ne contient ni appel à une interface distante, ni ressource externe — les polices de caractères elles-mêmes sont servies depuis le site, précisément pour qu’aucune requête ne parte ailleurs.',
      ],
    },
    {
      heading: 'Pas de compte, pas de mesure d’audience',
      body: [
        'Il n’y a pas d’inscription, donc pas d’adresse e-mail, pas de mot de passe, pas d’identifiant. Il n’y a ni outil de statistiques, ni cookie publicitaire, ni traceur d’aucune sorte, ni partage avec un tiers — pour la raison simple qu’il n’y a rien à partager.',
      ],
    },
    {
      heading: 'Le seul traitement de données personnelles',
      body: [
        'Servir une page laisse une trace chez l’hébergeur : ses journaux techniques conservent l’adresse IP de qui se connecte, l’horodatage et l’adresse demandée. C’est le fonctionnement normal d’un serveur web, et c’est le seul traitement de données personnelles dont l’éditeur soit responsable.',
        'Finalité : faire fonctionner le site et le protéger des abus. Base légale : l’intérêt légitime de l’éditeur à fournir un service qui tienne debout (article 6.1.f du RGPD). Durée : celle appliquée par l’hébergeur à ses propres journaux.',
        `Sous-traitant : ${HOST.name}, aux États-Unis. Le transfert repose sur sa certification au cadre de protection des données UE—États-Unis (EU-U.S. Data Privacy Framework), dont la liste publique est tenue par le département du Commerce américain.`,
      ],
    },
    {
      heading: 'Pourquoi il y a une notice, et pas un bandeau de consentement',
      body: [
        'Écrire ou lire quelque chose sur ton appareil suppose en principe ton consentement — et la règle vaut pour le stockage local et IndexedDB, pas seulement pour les cookies. Elle connaît une exception : ce qui est strictement nécessaire à la fourniture du service que tu as expressément demandé.',
        'C’est exactement le cas ici. La base IndexedDB, ce sont tes données elles-mêmes : sans elle, il n’y a pas d’app. Les cinq réglages du stockage local servent l’affichage, le rappel de sauvegarde et la notice du premier lancement, rien d’autre. Aucun identifiant, aucun suivi, aucune transmission. Il n’y a donc rien à te faire consentir, et un bandeau de consentement te ferait cliquer pour rien.',
        'Ce que tu as vu au premier lancement n’en est pas un. Il ne demande pas d’accepter, il ne propose pas de refuser, et le fermer ne change rien à ce que l’app fait : elle se comporte exactement pareil avant et après. C’est un accusé de lecture, et il existe parce que cette page-ci ne valait rien tant qu’elle ne se lisait qu’ici. Quelqu’un qui arrive méfiant saisit ses revenus avant d’avoir croisé une seule de ces lignes.',
      ],
    },
    {
      heading: 'Tes droits',
      body: [
        'Sur tes données, ils s’exercent directement, sans passer par personne : l’export te rend un fichier complet, chaque ligne se corrige ou se supprime dans l’app, et « Tout effacer » dans les réglages ne laisse rien de tes données derrière : la base est vidée, les sauvegardes locales aussi, et les deux dates de sauvegarde partent avec elles. C’est la conséquence directe du fait que ces données ne sont qu’à toi.',
        'Trois choses restent dans le stockage local après un effacement, parce qu’aucune ne parle de tes données : le thème, la palette, et le fait que tu as fermé la notice du premier lancement. Effacer ce qu’on a saisi ne fait pas oublier ce qu’on a lu, ni choisi.',
        'Sur les journaux de l’hébergeur, la demande se fait par le dépôt — le lien est en bas de cette page. Tu peux aussi introduire une réclamation auprès de la CNIL.',
      ],
    },
    {
      heading: 'La contrepartie, qu’il faut connaître',
      body: [
        'Puisque rien n’est ailleurs, rien ne se récupère ailleurs. Vider les données de ton navigateur les efface, et personne — l’éditeur compris — ne peut te les rendre. Rien ne se synchronise non plus d’un appareil à l’autre.',
        'D’où l’export, un fichier que tu ranges où tu veux, et le rappel que l’app t’adresse au bout de trente jours. Sur iPhone, installe l’app sur l’écran d’accueil : Safari efface les données d’un site non installé après environ sept jours sans visite.',
      ],
    },
  ],
}

const frTerms: LegalDocument = {
  intro:
    'Ce que le service promet, et ce qu’il ne promet pas. C’est court, parce qu’il n’y a ni compte, ni paiement, ni donnée collectée — donc presque rien à encadrer.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Ce que couvrent ces conditions',
      body: [
        `Elles portent sur le service rendu à l’adresse ${PUBLISHER.domain}. Elles ne portent pas sur le code : celui-ci est publié sous licence AGPL-3.0, et c’est cette licence — et elle seule — qui dit ce que tu peux en faire si tu le récupères pour le faire tourner ailleurs.`,
        'Utiliser le site vaut acceptation de ce qui suit.',
      ],
    },
    {
      heading: 'Un service gratuit, fourni en l’état',
      body: [
        'Tout compte fait est mis à disposition gratuitement, sans garantie de disponibilité, de continuité ni d’absence de défaut. Le service peut évoluer, être interrompu ou cesser, sans préavis et sans contrepartie. Le code étant ouvert, chacun reste libre de l’héberger lui-même : c’est la garantie que cette page ne peut pas donner.',
      ],
    },
    {
      heading: 'Ce n’est pas un conseil',
      body: [
        'L’app tient des comptes, elle ne donne aucun avis. Elle ne fournit ni conseil financier, ni conseil fiscal, ni conseil juridique, et n’est reliée à aucun compte bancaire : elle calcule sur les chiffres que tu saisis, et sa justesse ne va pas plus loin que la leur.',
        'Vérifier un chiffre avant d’en tirer une décision t’appartient. Les projections — prévisionnel, capital restant dû, répartition — sont des calculs sur des données déclarées, pas des engagements.',
      ],
    },
    {
      heading: 'Tes données sont à ta charge',
      body: [
        'Elles vivent dans ton navigateur, et nulle part ailleurs. Leur conservation relève donc de toi : l’export est la seule sauvegarde qui existe, et c’est toi qui le déclenches. L’éditeur ne peut ni les consulter, ni les restaurer, ni en produire une copie — ce n’est pas une réticence, c’est une impossibilité technique, et c’est la même que celle qui empêche quiconque d’autre de les lire.',
      ],
    },
    {
      heading: 'Responsabilité',
      body: [
        'Dans la limite de ce que permet la loi, l’éditeur ne peut être tenu responsable de la perte de données stockées sur ton appareil, d’une indisponibilité du service, ni des conséquences de décisions prises à partir des chiffres affichés.',
        'Rien dans ce paragraphe n’écarte la responsabilité qui ne peut pas l’être en droit français, notamment en cas de faute lourde ou dolosive.',
      ],
    },
    {
      heading: 'Usage loyal',
      body: [
        'Tu es responsable de ce que tu saisis. Le site n’héberge aucun contenu public et ne permet d’en publier aucun : il n’y a rien à modérer, et rien de ce que tu écris ne peut atteindre un tiers.',
      ],
    },
    {
      heading: 'Droit applicable',
      body: [
        'Ces conditions sont soumises au droit français. À défaut d’accord amiable, le litige relève des juridictions françaises compétentes.',
      ],
    },
  ],
}

/**
 * Les trois documents, dans la langue active.
 *
 * Même mécanique que `history.ts` et `landing.ts` : des liaisons d'export
 * vivantes, et les deux langues dans le même morceau — celui-ci est déjà hors
 * du graphe initial.
 *
 * **Une traduction, pas un second document.** Le droit applicable ne change
 * pas avec la langue de lecture : l'éditeur est français, l'hébergeur est le
 * même, et les conditions restent soumises au droit français. La version
 * anglaise dit donc exactement la même chose, et le dit dans la langue de qui
 * lit — ce qui est le seul moyen qu'un texte juridique serve à quelque chose.
 */
export let legalNotice: LegalDocument = currentLocale() === 'en' ? enNotice : frNotice
export let privacyPolicy: LegalDocument = currentLocale() === 'en' ? enPrivacy : frPrivacy
export let terms: LegalDocument = currentLocale() === 'en' ? enTerms : frTerms

subscribeLocale(() => {
  const english = currentLocale() === 'en'
  legalNotice = english ? enNotice : frNotice
  privacyPolicy = english ? enPrivacy : frPrivacy
  terms = english ? enTerms : frTerms
})
