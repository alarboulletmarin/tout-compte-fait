/* ============================================================================
 * Toutes les chaînes de l'app. Aucun composant n'écrit de texte en dur.
 * Français, casse normale, pas de majuscule décorative (DS §7).
 * ==========================================================================*/

import type { Widen } from './widen'

export const fr = {
  app: {
    name: 'Tout compte fait',
    tagline: 'Tes finances, sur ton appareil.',
  },

  /* La prose de la présentation n'est pas ici : elle vit dans `i18n/landing.ts`,
     avec la page qui la rend. Même raison que `i18n/legal.ts` — ce fichier-ci
     est importé par presque tous les composants, donc il pèse sur le premier
     chargement de tout le monde, et une page qu'on ne relit pas après avoir
     commencé n'a aucune raison d'y voyager. Seul son nom de lien reste
     ici, en `nav.landing` : « à propos » l'écrit sans charger la page. */


  common: {
    add: 'Ajouter',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    confirm: 'Confirmer',
    back: 'Retour',
    next: 'Continuer',
    all: 'Tous',
    optional: 'facultatif',
    required: 'obligatoire',
    yes: 'Oui',
    no: 'Non',
    less: 'Voir moins',
    other: 'Autres',
    /* Le retour arrière d'un message. Pas « Annuler » : c'est déjà le bouton
       qui ferme une boîte de dialogue, et les deux se seraient répondu dans la
       même — la raison qui fait dire « remettre à confirmer » plutôt
       qu'« annuler la confirmation ». « Rétablir » dit d'ailleurs ce qui se
       passe : l'état d'avant revient tel quel. */
    undo: 'Rétablir',
  },

  /* La garde de brouillon des quatre formulaires. La question dit ce qui se
     passe si l'on continue, jamais « êtes-vous sûr » (cahier §4.8), et le verbe
     qui reste n'est pas « Annuler » : on arrive dans cette boîte en cliquant
     « Annuler » sur le formulaire, et le même mot y voudrait dire l'inverse. */
  unsaved: {
    title: 'Saisie non enregistrée',
    question: 'Ce que tu viens de saisir sera perdu.',
    leave: 'Abandonner',
    stay: 'Continuer la saisie',
  },

  /* La notice du premier lancement (cahier §4.1). Ici et non dans un module
     chargé à la demande, contrairement à la prose de la présentation et des
     pages juridiques : elle est montée sur toute l'app, donc elle voyage de
     toute façon dans le graphe initial, et l'y différer ne ferait que la faire
     arriver après l'écran qu'elle est censée couvrir.

     Aucune de ces phrases ne dit « 0 traitement de données ». Servir la page
     laisse une trace dans les journaux de l'hébergeur, la page de
     confidentialité le dit en clair, et une notice faite pour être crue ne peut
     pas se faire prendre sur la seule ligne qu'on peut vérifier. Les quatre
     portent donc sur ce que devient *ce qu'on écrit*, ce qui reste vrai. */
  notice: {
    /* Les mots d'un bandeau cookies, dans l'autre sens. L'en-tête de la feuille
       tronque : sept syllabes, pas une phrase. */
    title: 'Aucun cookie, aucun serveur',
    lead: 'Un bandeau cookies te fait accepter ce qu’on prend. Celui-ci ne demande rien : il dit ce qu’il n’y a pas.',
    noAccount: 'Aucun compte : ni e-mail, ni mot de passe, ni identifiant.',
    noTracking: 'Aucun cookie, aucun traceur, aucune mesure d’audience, aucune publicité.',
    noServer:
      'Aucun serveur. Rien de ce que tu saisis ne quitte cet appareil, parce qu’il n’existe nulle part où l’envoyer.',
    /* La quatrième est la seule qui parle de quelqu'un plutôt que d'une
       technique, et c'est la question réellement posée : « qui va lire ça ? ». */
    noReader:
      'Personne ne lit tes données, ni l’auteur de l’app ni un tiers : il n’en existe aucune copie ailleurs à lire.',
    verify: 'Le code est ouvert, précisément pour que tout ça se lise au lieu de se croire.',
    /* La case est là pour qu'on lise, pas pour qu'on réponde : rien n'est
       enregistré de ce qu'elle vaut, et son seul effet est d'allumer le bouton.
       D'où l'aide, qui dit ce qu'elle fait. Un bouton éteint sans raison se lit
       comme une panne, et un `disabled` ne prend pas le focus pour l'expliquer
       lui-même. */
    check: 'J’ai lu',
    checkHint: 'Le bouton s’active quand la case est cochée.',
    action: 'J’ai compris',
  },

  direction: {
    in: 'Entrée',
    out: 'Sortie',
  },

  theme: {
    label: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
  },

  /**
   * L'apparence : le thème et la palette, deux réglages qui se combinent.
   *
   * Chaque palette dit ce qu'elle change en une ligne, et pas ce qu'elle
   * « évoque » : le nom seul ne dit pas grand-chose, et une phrase d'ambiance
   * en dirait encore moins que l'aperçu posé juste à côté.
   */
  appearance: {
    title: 'Apparence',
    /* Ce que la vue règle, en tête, parce que deux réglages qui se combinent ne
       se devinent pas l'un de l'autre. */
    intro:
      'Le thème dit clair ou sombre, la palette dit avec quelles couleurs. Chaque palette existe dans les deux thèmes.',
    paletteLabel: 'Palette',
  },

  /**
   * La langue, et les deux qu'on parle.
   *
   * **Chaque langue se nomme dans la sienne**, dans les deux catalogues :
   « Français » et « English », jamais « Anglais » ni « French ». C'est la règle
   * de tous les sélecteurs de langue, et elle a une raison précise — on vient
   * ici *parce qu'on ne lit pas* ce qui est affiché, et un mot traduit dans la
   * langue qu'on ne comprend pas est exactement celui qu'on ne saurait pas
   * reconnaître.
   *
   * Pas d'option « Système », contrairement au thème. La langue du navigateur
   * est lue une fois, au tout premier lancement, et devient une valeur écrite
   * dans le document (`i18n/locale.ts`) : la suivre en permanence ferait changer
   * de langue un même fichier selon l'appareil qui l'ouvre, ce qu'un réglage
   * porté par le document sert précisément à empêcher.
   */
  language: {
    label: 'Langue',
    fr: 'Français',
    en: 'English',
    /**
     * Les deux mêmes langues, en deux lettres, pour la bascule des écrans
     * d'avant le foyer — où le réglage n'est pas le sujet et n'a pas à prendre
     * la largeur d'un titre.
     *
     * Ce n'est pas une entorse à la règle du dessus, c'est la même : un code
     * ISO 639-1 ne se traduit pas — il vaut « FR » et « EN » dans les deux
     * catalogues, comme « Français » et « English » y valaient déjà eux-mêmes.
     * Il se reconnaît donc sans lire un mot de ce qui l'entoure, ce qui est
     * tout ce qu'on demande à ce sélecteur. Le nom complet, lui, ne disparaît
     * pas : il reste le nom accessible du bouton.
     */
    frShort: 'FR',
    enShort: 'EN',
    /* Ce que le réglage ne fait pas, comme la devise juste en dessous : il
       traduit l'interface, pas ce qu'on a saisi. Un foyer qui a nommé ses
       catégories en français les garde en français. */
    hint: 'Seule l’interface change, pas tes saisies.',
  },

  palettes: {
    classique: 'Classique',
    classiqueHint: 'Les couleurs d’origine — sapin, vert pomme, violet.',
    monochrome: 'Monochrome',
    monochromeHint: 'Une seule teinte, du plus clair au plus sombre.',
    douce: 'Douce',
    douceHint: 'Les mêmes familles, moins saturées.',
    vive: 'Vive',
    viveHint: 'Des teintes franches, qui se distinguent de loin.',
    neutre: 'Neutre',
    neutreHint: 'Presque sans couleur — sauf l’alerte.',
    contrastee: 'Contrastée',
    contrasteeHint: 'Le contraste poussé au maximum.',
  },

  nav: {
    label: 'Navigation principale',
    credits: 'Crédits',
    month: 'Le mois',
    calendar: 'Calendrier',
    subscriptions: 'Récurrences',
    history: 'Historique',
    styleguide: 'Styleguide',
    about: 'À propos',
    landing: 'La présentation',
    /* Le quatrième onglet. « Plus » et non « Menu » : il ne cache pas la
       navigation, il la continue — ce qu'on y trouve est le reste de l'app, pas
       une autre façon d'atteindre ce qui est déjà dans la barre. */
    more: 'Plus',
    /* Les quatre titres de groupe de l'écran « Plus ». Ils ne nomment pas des
       écrans mais des **intentions** — ce pour quoi on vient —, et c'est ce qui
       a permis de retirer « Réglages », qui n'en nommait aucune : il rangeait
       les personnes, les catégories, l'apparence, la devise, les données et
       « à propos » derrière un mot qui ne dit rien de ce qu'on y cherche.
       Trois verbes et un nom, parce que le quatrième groupe ne se fait pas :
       « Application » est ce dont on règle l'apparence, pas une action. */
    manage: 'Gérer',
    /* Pas « Configuration », qui retomberait dans le générique de « Réglages »,
       ni « Budget », que les quatre écrans de « Gérer » composent tout autant.
       « Organiser » dit ce qu'on y fait : structurer les personnes et les
       étiquettes dont le reste de l'app se sert. */
    organise: 'Organiser',
    /* Le cinquième groupe, et le seul dont le contenu ne décrit pas le foyer.
       « Simuler » et non « Calculateurs », pour la raison exacte qui a fait
       tomber « Réglages » : les quatre autres titres nomment une **intention**
       — ce pour quoi on vient —, quand « Calculateurs » nommerait une catégorie
       d'outil, c'est-à-dire ce qu'on a sous la main plutôt que ce qu'on
       cherche. C'est aussi ce qui le distingue de « Gérer » : on n'y règle
       rien, on essaie un chiffre pour voir. */
    simulate: 'Simuler',
    data: 'Données',
    application: 'Application',
    savings: 'Épargne',
    split: 'Répartition',
    /* La destination du simulateur, nommée ici et nulle part ailleurs : deux
       écrans y mènent — l'écran Épargne par sa rangée de fin, « Plus » par son
       groupe « Simuler » —, et deux libellés pour une porte finiraient par
       diverger. Toute la prose de l'écran d'arrivée, elle, est dans
       `i18n/projection.ts`, qui voyage avec lui.
       Le libellé ne promet aucun rendement, et la phrase dit exactement ce que
       l'écran fait : un calcul sous une hypothèse qu'on pose soi-même. */
    /* Le singulier : c'est un outil qu'on ouvre pour essayer quelque chose,
       pas une section où l'on rangerait des projections. Ce qui reste d'une
       simulation adoptée est un objectif, et il vit sous l'épargne. */
    projections: 'Simulation',
    projectionsHint: 'Ce qu’un versement régulier devient, sous une fourchette de rendement.',
    /* Ce que chaque rangée de « Gérer » dit d'elle-même : sur un écran qui n'est
       qu'une liste de portes, le libellé seul demande d'ouvrir pour savoir.
       Les rangées des trois autres groupes n'en ont pas besoin — elles disent
       leur **valeur** (« Maison · 3 membres », « Système · Classique »), ce qui
       renseigne mieux qu'une phrase et évite d'ouvrir. */
    subscriptionsHint: 'Ce qui revient chaque mois, écrit une fois.',
    savingsHint: 'Ce que tu peux mettre de côté, et où le placer.',
    splitHint: 'Qui verse quoi sur les charges communes.',
    creditsHint: 'Tes crédits en cours et ce qu’il reste à rendre.',
  },

  shell: {
    loading: 'Ouverture de tes données',
    /* Le bouton flottant, sous 1024px. Il nomme ce qu'il ouvre — trois portes
       de saisie — et non « Ajouter », qui promettrait une action alors qu'il
       en propose trois. La fermeture porte son propre nom : le même bouton
       change de sens, il doit changer d'étiquette. */
    quickEntry: 'Saisir une ligne',
    quickEntryClose: 'Fermer les portes de saisie',
    quickEntryLabel: 'Portes de saisie',
    filterByMember: 'Filtrer par membre',
    /* « Tout le monde » sur le filtre, « En commun » sur la saisie : ce n'est
       pas la même chose, et les deux ont porté la même étiquette. Ici c'est
       tout ce qui a eu lieu, le pot et les lignes de chacun ; là-bas c'est une
       ligne que personne ne porte, donc commune — d'où le mot qu'elle partage
       désormais avec le filtre « Commun » juste en dessous.
       Pas « Tout » non plus : la liste du mois porte déjà une pilule de ce nom,
       et deux « Tout » sur un même écran ne filtrent pas la même chose. */
    all: 'Tout le monde',
    common: 'Commun',
    commonShort: 'Le pot commun seul, à son montant plein.',
    commonNote:
      'Le pot commun seul, à son montant plein : les charges et les crédits que personne ne s’est attribués, plus ce qui est coché « à partager ». Aucune part n’est calculée ici — chacun verse la sienne sur l’écran Répartition.',
    /* Une ligne que personne ne porte est commune, par la règle même
       (`defaultShared`) : l'étiquette le dit désormais avec le mot du filtre
       voisin. Elle a dit « en commun » pendant que le filtre disait « tout
       le monde » à un écran d'écart, en voulant dire le contraire — l'un est
       une lecture, l'autre est ce que vaut une ligne sans propriétaire. */
    everyone: 'En commun',
    /* Les chiffres d'un membre comprennent sa part des charges communes : sans
       elle, chacun se lirait comme s'il vivait sans loyer. La liste des
       échéances, elle, garde les lignes réelles — on confirme une échéance
       entière, jamais une part.

       **Une phrase à l'écran, le reste dans une feuille.** La règle complète
       tenait sur trois lignes de gris, en tête de chaque écran du mois, sous la
       rangée de pilules et avant le premier chiffre : c'est-à-dire qu'on la
       relisait tous les jours pour l'avoir comprise une fois. Ce qui doit
       rester visible est ce qui change la lecture d'un chiffre — la part du
       commun est comprise —, et pas la mécanique qui le produit. Celle-ci
       s'ouvre, comme le calcul des quatre soldes (DS §6). */
    prorataShort: 'Les chiffres incluent sa part des charges communes.',
    prorata: 'Chiffres à la part de %s : sa part des charges communes est comprise, au prorata des revenus. Les listes gardent les échéances entières.',
    /* Le membre seul porte 100 % sans qu'aucun revenu soit exigé : « au
       prorata des revenus » serait un mensonge poli, et la vraie information
       est ailleurs — ses chiffres sont ceux de l'ensemble. */
    prorataSoloShort: 'Seule personne du foyer : ses chiffres sont ceux de l’ensemble.',
    prorataSolo:
      '%s est la seule personne ici : elle porte tout le commun, et ses chiffres sont ceux de l’ensemble. Les listes gardent les échéances entières.',
    /* Le titre de la feuille — court, parce que l'en-tête d'une feuille tronque
       et que « Comment ces chiffres sont calculés » y perdait ses trois derniers
       mots. Les avertissements de prorata incomplet, eux, ne s'ouvrent pas : ils
       nomment déjà ce qui manque, et il n'y a rien de plus à en dire que le
       geste qu'ils appellent. */
    prorataSheet: 'Le calcul de ces chiffres',
    prorataMissingOne:
      'Charges communes non réparties, faute de connaître le revenu de %s : seules les lignes à son nom sont comptées.',
    prorataMissingMany:
      'Charges communes non réparties, faute de connaître les revenus de %s : seules les lignes à son nom sont comptées.',
    prorataOnlyOwn:
      'Charges communes non réparties : seules les lignes à son nom sont comptées.',
    /* Le nom accessible du bloc titre quand il ramène au mois courant.

       Il nomme le mois **et** son année, contrairement à ce qu'on lit dessus :
       un geste posé sur un titre n'est annoncé par rien d'autre que son nom, et
       « Revenir » seul laisserait deviner où. Le texte visible de l'action —
       « revenir à août » — y est contenu, ce que le §8 demande.

       « Revenir à un mois » et non « à aujourd'hui » : on revient à un mois, pas
       à un jour, et le DS §7 veut que les libellés nomment ce qu'on manipule.
       Sur l'écran du calendrier, « Aujourd'hui » aurait de surcroît promis de
       ramener au jour, ce que ce geste ne fait pas. */
    thisMonthTitle: 'Revenir à %s',
    /* Le retour tel qu'il s'écrit **dans** le bloc titre, sous le nom du mois
       affiché. En bas de casse, parce que la ligne est un axe et non un
       eyebrow : `t-eyebrow` passe tout en capitales, et le DS §7 ne veut pas de
       majuscule décorative sur ce qui est un bouton. Ce qu'on lui passe est le
       mois seul quand l'année de gauche est déjà la bonne, et le mois avec son
       année sinon — `MonthNav` tranche, et dit pourquoi. */
    returnToShort: 'revenir à %s',
  },

  /* La frontière avec le navigateur. Tout ce qui s'y passe mal doit se dire :
     les données ne vivent nulle part ailleurs, et un échec silencieux se
     découvre au moment où il est trop tard. Chaque message dit ce qui s'est
     passé et quoi faire — jamais « une erreur est survenue ». */
  storage: {
    readFailed:
      'Les données n’ont pas pu être lues. Tu peux repartir de zéro ou importer un export.',
    writeFailed: 'Les modifications ne s’enregistrent plus',
    /* Ce que l'échec change, puis ce qui a pu le causer — dans cet ordre, parce
       que la première phrase est vraie à coup sûr et la seconde seulement
       probable. Les trois hypothèses couvrent les trois façons dont l'app perd
       le droit d'écrire, y compris l'onglet concurrent que le titre nomme déjà
       quand c'est lui : aucune ne contredit un titre plus précis qu'elle.
       L'export n'est plus une consigne dans la phrase — un bouton le dit. */
    writeFailedBody:
      'Ce que tu tapes reste à l’écran, mais rien n’est gardé. Navigation privée, espace saturé, ou un autre onglet qui tient la base.',
    writeFailedLabel: 'Échec d’enregistrement',
    /* Le message rouge qui suit **chaque** écriture ratée, y compris le « Réessayer »
       du bandeau. Il ne redit pas le titre du bandeau : celui-ci décrit l'état,
       celui-là parle du geste qu'on vient de faire — c'est la seule façon de
       relier la panne à la ligne qu'on était en train de saisir. Il ne propose
       aucun retour arrière : il n'y a rien à rattraper, ce qui est à l'écran
       reste à l'écran, c'est le disque qui est en retard. */
    writeFailedToast: 'Ce que tu viens de saisir n’est pas enregistré',
    /* Gratuit, et il répare parfois : un quota libéré, un onglet fermé. Il vient
       donc avant l'export, qui ne répare rien mais met à l'abri. */
    retry: 'Réessayer',
    /* « D'abord », parce que c'est ce que l'ordre des deux boutons dit déjà :
       exporte avant de fermer, avant de recharger, avant de continuer à taper
       dans une app qui ne garde rien. */
    exportFirst: 'Exporter d’abord',

    /* L'avis de conservation : le niveau du dessous, et il se lit à sa langue.
       Rien n'a échoué, donc rien n'est au passé ni en rouge — on constate un
       engagement qui n'a pas été pris, pas une perte. Et surtout aucune phrase
       ne prétend savoir *pourquoi* : « mode privé détecté » serait faux un jour
       sur deux, et un avertissement qui se trompe sur la cause discrédite le
       conseil qui, lui, reste bon. */
    durabilityTitle: 'Tes données sont enregistrées sur cet appareil',
    durabilityBody:
      'Ce navigateur ne garantit pas leur conservation dans la durée. Un export est la seule copie qui ne dépende pas de lui.',
    durabilityLabel: 'Conservation non garantie',
    durabilityDismiss: 'Masquer l’avis de conservation',

    /* Les trois incidents de connexion. Chacun dit ce qu'il faut faire, et
       aucun ne dit « rechargez la page » sans expliquer pourquoi. */
    blocking:
      'Un autre onglet met la base à jour. Cet onglet-ci n’enregistre plus rien tant qu’il n’est pas rechargé.',
    blocked:
      'Un autre onglet utilise une version différente de l’app. Ferme-le, puis recharge cette page.',
    terminated:
      'Le navigateur a fermé la base sous l’app. Recharge la page — et exporte d’abord, par précaution.',
    readTimeout:
      'La base de données ne répond pas. Un autre onglet la bloque peut-être : ferme-le, puis recharge.',

    /* Ce que dit l'onglet qui n'était plus à jour. En passant, jamais en
       modale : il n'a rien perdu au-delà de ce qu'il tapait à l'instant, et
       l'arrêter pour le lui dire serait pire que le lui dire au vol. */
    otherTab: 'Mis à jour depuis un autre onglet.',
    otherTabCleared: 'Les données ont été effacées depuis un autre onglet.',

    /* Le chemin de sortie d'un document qu'on ne sait pas ouvrir. Les recours
       sont dans l'ordre de ce qu'ils sauvent : importer récupère, recharger ne
       coûte rien à essayer, effacer ne se défait pas. */
    recoverTitle: 'Tes données ne se lisent pas',
    recoverImportHint:
      'C’est le seul recours qui ne perd rien. Si tu as un fichier d’export, c’est le moment.',
    recoverRaw: 'Télécharger la copie brute',
    recoverRawHint:
      'Le contenu tel qu’il est stocké, avant toute lecture. Un document que cette version de l’app ne sait pas ouvrir n’est pas forcément perdu — garde-le avant d’effacer quoi que ce soit.',
    recoverRawEmpty: 'Il n’y a rien de stocké à copier.',
    recoverRawDone: 'Copie brute téléchargée',
    recoverReload: 'Recharger',
    recoverReloadHint:
      'Une base momentanément occupée se relit souvent au deuxième essai. Ça ne coûte rien.',
    discard: 'Effacer et repartir de zéro',
    discardHint:
      'En dernier. Ce qui est stocké part définitivement, et personne ne sait ce qu’il y avait dedans.',
    discardConfirm1:
      'Ce qui est stocké sur cet appareil sera effacé, sans qu’on ait pu le lire ni te dire ce qu’il contenait.',
    discardConfirm2: 'Il n’y a pas de retour. Tu as téléchargé la copie brute ?',
    discarded: 'Données effacées',

    /* L'écran de secours. Il n'a qu'une chose importante à faire faire, et ce
       n'est pas de comprendre ce qui s'est passé. */
    crashTitle: 'L’app s’est arrêtée',
    crashBody:
      'Tes données sont toujours là, sur cet appareil. Récupère-les d’abord : c’est le seul geste qui ne se rattrape pas si tu ne le fais pas maintenant.',
    crashExport: 'Récupérer mes données',
    crashExportEmpty: 'Il n’y a rien de stocké sur cet appareil.',
    crashExportFailed: 'La base n’a pas répondu. Recharge, puis réessaie.',
    crashReload: 'Recharger l’app',
    crashCaches: 'Réinstaller l’app',
    crashCachesHint:
      'Si l’écran revient cassé à chaque rechargement, c’est la version en cache qui est en cause. Ceci la retélécharge. Tes données ne sont pas touchées : elles ne vivent pas dans le cache.',

    /* La section des réglages. Elle parle de **ce navigateur** — la place qu'il
       prête, ce qu'il promet de garder — là où « Données » parle des fichiers
       qui en sortent. */
    title: 'Sur cet appareil',
    /* L'état d'abord, l'explication ensuite. Les deux phrases ci-dessous disent
       ce qu'il faut comprendre, mais elles se lisent — et un réglage se
       reconnaît d'un coup d'œil avant de se lire. Quatre mots au-dessus, dans
       la lettre du texte courant, et la prose passe en dessous. */
    stateKept: 'Tes données sont conservées',
    stateFragile: 'Rien n’est promis',
    /* Le troisième état, qui n'existait pas. Un navigateur sans l'API de
       stockage ne *refuse* pas : il ne répond pas, et l'app écrivait jusqu'ici
       « rien n'est promis » sur la foi de ce silence. Le conseil est le même,
       l'affirmation ne l'est pas. */
    stateUnknown: 'Ce navigateur ne dit rien',
    persisted:
      'Le navigateur s’est engagé à garder tes données tant que tu ne les effaces pas toi-même.',
    notPersisted:
      'Le navigateur n’a rien promis : il peut effacer tes données s’il manque de place. Un export régulier reste la vraie protection.',
    persistUnknown:
      'Ce navigateur ne dit pas s’il conserve tes données. Ce n’est pas un refus, mais on ne peut pas s’y fier : un export régulier reste la vraie protection.',
    /* Ce qu'on ne pouvait pas dire tant que le fait d'avoir demandé n'était pas
       gardé : « on n'a jamais demandé » et « on a demandé, il a refusé » ne se
       lisaient qu'à la même phrase. */
    persistAsked: 'La conservation lui a déjà été demandée.',
    /* L'installation, dite là où la conservation se lit et nulle part ailleurs :
       la présentation porte déjà le bandeau d'installation, et le répéter sur
       le tableau de bord ferait de l'app une réclame pour elle-même. */
    installHint:
      'Une app installée sur l’écran d’accueil est moins exposée : iOS efface les données des sites qu’on n’a pas ouverts depuis environ une semaine.',
    persistAsk: 'Demander à les garder',
    persistGranted: 'C’est accordé.',
    persistRefused: 'Le navigateur a refusé. Rien n’est perdu — exporte plus souvent.',
    persistSilent: 'Ce navigateur ne répond pas à la question. Rien n’est perdu — exporte plus souvent.',
    usage: '%s occupés sur %s disponibles.',
    usageUnknown: 'Ce navigateur ne dit pas la place qu’il te laisse.',

    /* Le résumé de la vue des données : trois lignes, une étiquette et une
       valeur chacune. C'est là qu'on vient comprendre où sont ses données et
       depuis quand elles ne sont copiées nulle part — la vue « Sur cet
       appareil » garde le détail, les chiffres et les gestes. */
    placeLabel: 'Stockage',
    placeValue: 'Sur cet appareil',
    keepLabel: 'Conservation',
    keepPersistent: 'Persistante',
    keepFragile: 'Non garantie par ce navigateur',
    keepUnknown: 'Non communiquée par ce navigateur',
    lastExportLabel: 'Dernier export',
    lastExportNever: 'Jamais',
    statusMore: 'Détail du stockage sur cet appareil',

    backups: 'Sauvegardes locales',
    backupsHint:
      'Une sauvegarde par jour de saisie, les cinq dernières. Chacune porte l’état d’avant les modifications du jour. Elles vivent dans ce navigateur : elles ne remplacent pas un export.',
    backupsEmpty: 'Aucune sauvegarde pour l’instant. La première arrive à la prochaine journée de saisie.',
    backupContents: '%s entrées, %s récurrences',
    backupRestore: 'Restaurer',
    backupConfirm1:
      'Cette sauvegarde remplacera intégralement les données actuelles — %s, du %s.',
    backupConfirm2: 'Tout ce qui a été saisi depuis sera perdu.',
    backupRestored: 'Sauvegarde restaurée',
  },

  settings: {
    /* L'apparence est une rangée qui dit sa valeur — « Système · Douce » — et
       mène à sa vue. Le thème y a suivi la palette : trois positions tenaient
       sur une rangée, six aperçus non, et les séparer aurait fait régler les
       couleurs à deux endroits. */
    appearanceSummary: '%s · %s',

    currency: 'Devise',
    /* La phrase dit ce que ce réglage **ne fait pas**, et rien d'autre : un
       sélecteur de devise invite à croire qu'on convertit ; l'app ne convertit
       rien et ne le fera pas — le cahier §2 laisse la multi-devise hors v1. Ne
       rien dire laisserait changer de devise en pensant que les montants
       suivent ; en dire plus reviendrait à décrire ce que le sélecteur montre
       déjà. */
    currencyHint: 'Rien n’est converti : seul le symbole change.',
    /* Ce que « à propos » contient, sur une ligne — la version en tête, parce
       que c'est la seule chose qu'on y cherche sans l'avoir déjà lue. */
    aboutSummary: 'Version %s · le projet, le code, la licence',

    household: 'Personnes',
    /* Le nom ne décrit plus un foyer, il décore un en-tête — et il est
       facultatif : la barre latérale affiche déjà le nom de l'app au-dessus,
       et se passe très bien d'une seconde ligne. Il ne se demande donc plus au
       premier lancement, où il était la seule réponse exigée de toute l'app. */
    householdName: 'Nom affiché',
    /* Sans « Facultatif. » : l'étiquette du champ le dit déjà, à trois
       centimètres au-dessus. */
    householdHint: 'En haut de chaque écran.',
    householdPlaceholder: '',
    members: 'Membres',
    /* Le résumé que lit la page d'entrée : le nom affiché tient la première
       ligne, celui-ci la seconde. Il répond à « qui compose mon foyer » sans
       ouvrir quoi que ce soit — c'est tout ce qu'on demande à une page de
       réglages. */
    membersCountOne: '%s membre',
    membersCount: '%s membres',
    membersNone: 'Personne pour l’instant',
    memberAdd: 'Ajouter un membre',
    memberName: 'Prénom',
    memberPlaceholder: 'Alix',
    /* Sur la fiche d'un membre : ce qu'il gagne, et sa part. Le chiffre ne s'y
       saisit pas — il se lit sur ses récurrences de ressources —, l'étiquette
       nomme donc une lecture, pas un champ. */
    memberIncome: 'Revenu mensuel',
    /* Le prénom se corrige sur place, comme le libellé d'une catégorie. Le nom
       accessible porte celui qu'on modifie : la liste compte un champ par
       membre, et « Prénom » seul les annoncerait tous pareil. */
    memberRemove: 'Retirer %s',
    memberRemoved: '%s a été retiré·e',
    memberRemoveHint: 'Ses entrées sont conservées, simplement sans étiquette.',
    memberRemoveConfirm:
      'Ses entrées et ses récurrences repassent en commun : rien n’est effacé. Retirer %s ?',
    /* Une avance est toujours à quelqu'un : elle ne peut pas repasser en commun
       comme le reste, donc elle part. C'est la seule chose que ce geste efface,
       et la question ne peut pas la taire — les mensualités déjà revenues sur
       le livret, elles, restent. */
    memberRemoveConfirmAdvanceOne:
      'Ses entrées et ses récurrences repassent en commun. Son avance, elle, ne peut appartenir à personne : elle est supprimée, ses mensualités déjà versées restent. Retirer %s ?',
    memberRemoveConfirmAdvances:
      'Ses entrées et ses récurrences repassent en commun. Ses %s avances, elles, ne peuvent appartenir à personne : elles sont supprimées, leurs mensualités déjà versées restent. Retirer %s ?',
    /* Un support d'épargne est toujours à quelqu'un, comme une avance : il ne
       peut pas repasser en commun, donc il part avec ses relevés. Les
       mouvements, eux, restent — ils ont eu lieu, et seul leur lien se coupe.
       C'est la même règle que la suppression d'une récurrence, qui détache ses
       échéances sans les effacer. */
    memberRemoveSupportOne:
      'Il possède 1 support d’épargne : il sera supprimé, avec son historique de valeur. Les versements déjà enregistrés restent, sans rattachement.',
    memberRemoveSupports:
      'Il possède %s supports d’épargne : ils seront supprimés, avec leur historique de valeur. Les versements déjà enregistrés restent, sans rattachement.',
    /* Réattribuer plutôt que perdre : c'est le même geste que changer le
       propriétaire depuis la fiche du support, et il vaut mieux le proposer
       avant que de le regretter après. */
    memberSupportsReassign:
      'Tu peux d’abord les réattribuer à quelqu’un d’autre depuis l’écran Épargne.',
    memberSupportsGo: 'Voir ses supports d’épargne',
    /* Personne n'est le cas par défaut, pas une dérogation : la phrase dit ce
       qui se passe alors, sans concéder que ça « fonctionne quand même ». */
    membersEmpty:
      'Personne pour l’instant : tout t’est attribué. Ajoute quelqu’un si tu partages des dépenses.',
    /* Le revenu ne se saisit pas ici : il se lit sur les récurrences de
       ressources du membre. Le stocker à côté en ferait une seconde vérité.
       Reste à dire *pourquoi* il ne se lit pas, quand c'est le cas : les deux
       causes n'appellent pas le même geste, et « aucun revenu enregistré »
       envoyait créer une récurrence qui existait déjà. */
    memberNoIncome: 'aucun revenu enregistré',
    memberIncomeUnpriced: 'revenu à montant variable, pas encore chiffré',
    memberIncomeUnpricedFix: 'Indiquer un montant habituel',
    /* Un revenu chiffré à zéro n'est pas un revenu de zéro : c'est un chiffre
       qu'on ne sait pas lire. Sans ce message, la personne se voyait attribuer
       0 % des charges communes — un résultat, donc introuvable. */
    memberIncomeZero: 'revenu déclaré à zéro',
    memberIncomeZeroFix: 'Corriger le montant',
    memberIncomeHint:
      'Le revenu de chacun se lit sur ses récurrences de salaire ou d’allocation, et sert à répartir les charges communes au prorata.',
    memberIncomeLink: 'Ajouter un revenu',
    /* Un salaire resté « en commun » ne compte dans le revenu de personne, et
       c'est la première explication d'une répartition qui ne se calcule pas. */
    incomeUnassignedOne: '%s n’est à personne : ce revenu ne compte dans aucune part.',
    incomeUnassignedMany: '%s ne sont à personne : ces revenus ne comptent dans aucune part.',
    incomeUnassignedFix: 'Attribue-les à quelqu’un pour qu’ils pèsent dans le prorata.',
    memberShareOf: '%s des charges communes',
    /* La seule porte de la répartition était une tuile du mois, qui se retire
       sous un filtre par membre. Ici elle est toujours là, et c'est l'endroit
       où l'on se demande qui verse quoi : les coefficients sont juste au-dessus. */
    splitLink: 'Voir la répartition du mois',

    categories: 'Catégories',
    families: 'Familles',
    familyAdd: 'Ajouter une famille',
    familyName: 'Nom de la famille',
    familyPlaceholder: 'Animaux',
    familyKind: 'Nature',
    categoryAdd: 'Ajouter une catégorie',
    categoryName: 'Libellé',
    categoryPlaceholder: 'Loisirs',
    categoryArchive: 'Archiver %s',
    categoryRestore: 'Réactiver %s',
    familyCountOne: '%s catégorie',
    familyCount: '%s catégories',
    /* Le pendant du précédent, pour le résumé de la page d'entrée : « 46
       catégories · 12 familles » dit la taille du catalogue sans en déplier une
       seule ligne. */
    familiesCountOne: '%s famille',
    familiesCount: '%s familles',
    /* Deux vides, deux phrases : un catalogue sans aucune famille n'est pas une
       famille sans catégorie, et la seconde n'invite pas au même geste. */
    familiesEmpty: 'Aucune famille pour l’instant.',
    familyEmpty: 'Aucune catégorie ici pour l’instant.',
    archive: 'Archiver',
    restore: 'Réactiver',
    /* « Sens » et « Archivées » vivaient ici sans être écrits nulle part : le
       sens d'une catégorie découle de la nature de sa famille depuis qu'il ne
       se saisit plus, et rien ne filtre plus les archivées — leur pastille en
       pointillés le dit dans la liste. */
    categoriesHint:
      'Une catégorie n’est jamais effacée : elle est archivée, et les entrées passées la gardent.',
    /* Quarante-six catégories sous onze familles repliées : retrouver
       « Carburant » demandait de deviner qu'elle est rangée sous Transport. */
    categorySearch: 'Rechercher une catégorie',
    categorySearchPlaceholder: 'Carburant',
    categorySearchEmpty: 'Aucune catégorie ne correspond à « %s ».',

    /* Les deux vues que le groupe « Données » ouvre, et ce qu'elles contiennent
       — dit en une ligne chacune, à la place des deux tuiles pleines qu'elles
       étaient. « Sur cet appareil » porte son titre dans `storage`, avec le
       reste de ce qui parle au navigateur ; le titre du groupe, lui, est dans
       `nav`, avec les trois autres intentions de l'écran « Plus ». */
    storageSummary: 'Données conservées localement',
    transfer: 'Exporter / importer',
    transferSummary: 'Sauvegarder ou restaurer les données',
    /* Les deux premières intentions de la vue des données — les deux autres se
       nomment déjà, « Schéma de données » et « Jeu d'exemple ». Des titres, pas
       des cartes : une carte par bouton aurait donné le même poids visuel à
       « exporter tout » et à « télécharger le schéma ». */
    backupGroup: 'Sauvegarde',
    restoreGroup: 'Restauration',
    export: 'Exporter mes données',
    exportHint: 'Un fichier .json contenant tout, à ranger où tu veux.',
    exported: 'Export téléchargé',
    /* La date du dernier export ne se dit plus ici : elle a rejoint le résumé
       de la vue, où elle se lit à côté de ce que le navigateur promet — les
       deux faits ne veulent rien dire l'un sans l'autre. */

    /* L'autre sortie du même fichier : la feuille de partage du système. Le
       bouton n'existe que là où elle accepte un .json — un bouton qui ouvre
       une feuille vide ne serait qu'une fausse promesse de plus sur le geste
       qui sauvegarde. « Envoyer vers… », avec ses points de suspension : ils
       disent qu'un choix vient après le clic, et que rien ne part avant. */
    share: 'Envoyer vers…',
    shareHint:
      'Le même fichier, remis directement à un autre appareil — AirDrop, Partage à proximité, une messagerie. Il ne passe pas par le dossier des téléchargements.',
    shared: 'Export envoyé',
    /* Ce que le repli doit dire : ce qui n'a pas marché, et où le fichier a
       atterri quand même. Sans la seconde phrase, on croit repartir les mains
       vides et on recommence. */
    shareFailed: 'Le partage n’a pas abouti. Le fichier a été téléchargé à la place.',
    import: 'Importer un fichier',
    importHint: 'Remplace intégralement les données actuelles.',
    importConfirm: 'Remplacer toutes les données par ce fichier ?',
    /* Un import est un effacement déguisé : le fichier arrive, tout le reste
       part. Il se confirme donc deux fois, comme un remplacement, sans aller
       jusqu'aux trois de la réinitialisation — il reste quelque chose après. */
    importConfirm2: 'Les personnes, les récurrences et les entrées actuelles seront perdues. Confirmer ?',
    imported: 'Données importées',
    importMigrated: 'Données importées et mises à jour depuis un format plus ancien',
    /* Un import qui n'aboutit pas et qui ne le dit pas est la pire des pertes :
       on vient d'accepter d'effacer ce qu'il remplace. */
    importFailed: 'L’import n’a pas abouti. Recharge la page avant de réessayer.',

    /* Ce que la lecture a écarté et réparé, dit avant qu'on confirme.
       Jusqu'ici une dépense illisible disparaissait en silence dans un geste
       qui remplace tout le document : le meilleur moyen de ne jamais s'en
       apercevoir, puisque le fichier, lui, a l'air d'être passé. */
    reportDiscardedOne: '1 ligne ne sera pas importée :',
    reportDiscarded: '%s lignes ne seront pas importées :',
    reportRepairedOne: '1 lien ne menait nulle part et a été rattaché :',
    reportRepaired: '%s liens ne menaient nulle part et ont été rattachés :',
    reportMore: '… et %s de plus.',
    /* « Entrée « Loyer » — montant illisible », ou son rang à défaut de nom. */
    reportLine: '%s — %s',
    reportNamed: '%s « %s »',
    reportRanked: '%s n° %s',

    reportCollection: {
      members: 'Membre',
      families: 'Famille',
      categories: 'Catégorie',
      recurrences: 'Récurrence',
      entries: 'Entrée',
      debts: 'Crédit',
      advances: 'Avance',
      savingSupports: 'Support d’épargne',
      savingValuations: 'Valorisation',
      savingRates: 'Taux d’épargne',
      savingGoals: 'Objectifs',
      months: 'Mois',
    },
    reportReason: {
      shape: 'ligne illisible',
      amount: 'montant illisible',
      principal: 'capital illisible',
      date: 'date inexistante',
      month: 'mois inexistant',
      noMember: 'sans personne à qui elle est',
      period: 'période à l’envers',
      rate: 'taux illisible',
      duplicateId: 'identifiant en double',
      unknownCategory: 'catégorie introuvable, rangée dans « À ranger »',
      unknownFamily: 'famille introuvable',
      unknownMember: 'membre introuvable, rendue en commun',
      unknownRecurrence: 'récurrence introuvable, lien retiré',
      unknownSupport: 'support d’épargne introuvable, lien retiré',
    },

    /* Le pendant de l'import : le seul moyen d'obtenir un fichier importable
       était jusqu'ici d'avoir déjà saisi ce qu'on cherche à saisir. */
    schema: 'Schéma de données',
    schemaHint:
      'Le modèle complet, à donner à un assistant avec tes notes : il te rendra un fichier à importer ici.',
    schemaCopy: 'Copier le schéma',
    schemaDownload: 'Télécharger le schéma',
    schemaCopied: 'Schéma copié',
    schemaCopyFailed: 'La copie a échoué. Télécharge le fichier à la place.',
    /* Les deux modules chargés à la demande. Hors ligne, la requête échoue et
       les boutons restaient désactivés pour toujours, sans un mot. */
    schemaUnavailable: 'Le schéma n’a pas pu être chargé. Vérifie ta connexion, puis recharge.',

    example: 'Jeu d’exemple',
    exampleHint:
      'Un exemple complet — trois personnes, six crédits, six avances, huit supports d’épargne, cinq ans d’historique — pour voir l’app pleine sans rien saisir.',
    exampleLoad: 'Charger l’exemple',
    /* Un exemple remplace tout, exactement comme un import : deux questions, ni
       une de moins ni les trois de l'effacement, puisqu'il reste quelque chose
       après. Au premier lancement, en revanche, il n'y a rien à perdre et on
       n'en pose aucune. */
    exampleConfirm: 'Remplacer toutes les données par le jeu d’exemple ?',
    exampleConfirm2: 'Les personnes, les récurrences et les entrées actuelles seront perdues. Confirmer ?',
    exampleLoaded: 'Jeu d’exemple chargé',
    exampleFailed: 'Le jeu d’exemple n’a pas pu être chargé. Vérifie ta connexion, puis réessaie.',

    /* Le seul geste de l'app qui n'épargne rien vivait au milieu des outils,
       sous la même forme qu'« Exporter » et « Copier le schéma ». Il a
       maintenant sa zone, en bas et à part : ce n'est pas la couleur qui
       prévient l'erreur, c'est la distance et le titre qui l'annonce. */
    sensitive: 'Zone sensible',
    resetTitle: 'Effacer toutes les données',
    reset: 'Tout effacer',
    resetHint: 'Efface les personnes, les récurrences et toutes les entrées. Sans retour.',
    /* Trois questions, et trois questions différentes : ce qui part, le fait
       qu'il n'y a pas de retour, puis la dernière chance d'exporter. Trois fois
       la même phrase ne se lit pas, elle se clique. */
    resetConfirm1: 'Effacer toutes les données de cet appareil ?',
    resetConfirm2:
      'Les personnes, les récurrences, les crédits et toutes les entrées partent. Il n’y a pas de retour.',
    resetConfirm3: 'Dernière question. Exporte d’abord si tu veux garder une trace.',
    resetDone: 'Données effacées',
    resetFailed: 'L’effacement n’a pas abouti. Recharge la page et réessaie.',

    reminderTitle: 'Ton dernier export date de plus de 30 jours.',
    reminderTitleNever: 'Tes données ne sont enregistrées que dans ce navigateur.',
    reminderBody: 'Les données vivent dans ce navigateur. Un export les met à l’abri.',
    reminderDismiss: 'Plus tard',
    reminderLabel: 'Rappel de sauvegarde — balaie vers le haut pour l’écarter',

    updateAvailable: 'Une nouvelle version est prête.',
    updateAction: 'Recharger',
  },

  /* Les chaînes de l'historique vivent dans `i18n/history.ts` : cet écran-là
     se charge à la demande, et sa prose n'a pas plus de raison que ses
     graphiques de voyager dans le graphe initial. `fr.nav.history`, lui, reste
     ici — la barre d'onglets nomme l'écran sans le charger. */


  dashboard: {
    balance: 'Solde du mois',
    income: 'Revenus',
    incomeLeft: 'dont %s encore à venir',
    incomeAllIn: 'tout est déjà rentré',
    incomeNone: 'aucun revenu ce mois-ci',
    charges: 'Charges',
    chargesLeft: 'reste %s à payer',
    chargesAllPaid: 'tout est payé',
    chargesNone: 'rien à payer ce mois-ci',
    /* Les deux soldes qui projettent le mois, dans un seul cadre : ils
       annoncent régulièrement le même montant au centime — sans rentrée
       d'argent en vue, le reste à vivre prend la fin du mois pour horizon,
       donc exactement celui du prévisionnel — et la phrase qui les sépare ne
       s'affiche sur aucune tuile plate en deçà de 1024px. En rangée, elle
       passe à la ligne et se lit partout. */
    situation: 'Situation',
    forecast: 'Prévisionnel',
    /* Ces deux phrases-là ne décrivent plus un calcul, elles disent l'horizon :
       c'est la seule chose qui sépare les deux lectures, et c'est donc ce
       qu'il faut lire quand elles rendent le même chiffre. */
    forecastHint: 'solde attendu en fin de mois, échéances prévues comprises',
    remaining: 'Reste à vivre',
    remainingHint: 'disponible jusqu’à la prochaine rentrée d’argent',
    remainingNoIncome: 'disponible jusqu’à la fin du mois',
    /* Quand les deux rangées tombent au même centime, et elles y tombent
       souvent : sans rentrée d'argent à venir, « reste à vivre » prend la fin
       du mois pour horizon, donc exactement celui du prévisionnel. Deux fois
       le même chiffre sous deux libellés se lit comme une erreur de calcul ;
       il faut donc que l'écran dise que c'en est une conséquence. */
    remainingSame: 'même horizon que le prévisionnel, donc le même montant',
    upcoming: 'Prochaines échéances',
    /* « Charge ni crédit », pas « sortie » : la tuile compte par nature, hors
       épargne, et un mois où l'on n'a fait que verser sur un livret a bien vu
       des sorties — simplement rien qui soit sorti pour de bon. */
    noBreakdown: 'Aucune charge ni crédit ce mois-ci.',
    /* La tuile ne s'arrête pas au mois affiché : elle lit les règles au-delà
       des mois déjà ouverts. Son vide dit donc qu'il n'y a plus rien du tout —
       et c'est justement pour ça qu'il n'a pas la même cause selon qu'une règle
       existe ou non.

       Sans aucune récurrence, ce vide est le vide d'un document qui n'a pas
       démarré, et le geste qui l'amorce n'est pas une dépense : c'est la même
       distinction que fait déjà le mois vide (`month.emptyStart`). Avec des
       règles en place, il n'y a plus rien à proposer — les échéances viendront
       toutes seules —, et le constat suffit. Un état vide est une invitation
       quand il y a quelque chose à inviter, pas une invitation de principe. */
    noUpcoming: 'Aucune échéance à venir.',
    noUpcomingStart:
      'Aucune échéance à venir. Écris une fois ce qui revient chaque mois, et les prochaines s’inscriront ici toutes seules.',
    progress: 'Jour %s sur %s',
    monthAhead: 'Mois à venir',
    monthDone: 'Mois terminé',

    /* Le couple prévu / confirmé, lu au niveau du mois.
       C'est le concept central du produit — une opération se prévoit, puis se
       confirme —, et il ne se lisait nulle part comme un avancement : chaque
       ligne portait le sien, le mois ne portait pas le compte. Savoir qu'il
       reste quatre échéances demandait de descendre jusqu'à la liste et de
       lire son titre.

       **Des opérations, et non des échéances.** Le compte additionne les
       lignes ponctuelles — des faits, jamais prévues — aux échéances de
       récurrence, qui le sont. « 12 / 16 échéances » aurait rangé sous ce mot
       des lignes qui n'en sont pas, alors que le cahier §4.3 le réserve à ce
       qu'une règle produit.

       **Un ratio en toutes lettres, pas une jauge.** Une tuile plate n'offre
       que 56px utiles, où un anneau n'entre pas ; et « 12 / 16 » se lit là où
       un arc demande d'être interprété. C'est aussi ce que demande le DS §8 :
       la lecture ne repose ni sur une forme ni sur une couleur. */
    monthStatus: 'Suivi du mois',
    monthStatusConfirmed: 'opérations confirmées',
    /* Le nom accessible dit l'état, puis le geste — dans cet ordre, parce que
       le geste ne se devine pas d'un chiffre. Sans échéance prévue il n'y a
       plus de geste, et la seconde phrase tombe avec lui. */
    srMonthStatus: '%s opérations confirmées sur %s.',
    srMonthStatusGo: '%s opérations confirmées sur %s. Voir ce qui reste à confirmer.',

    capacity: 'Capacité d’épargne',
    capacityHint: 'ressources − charges − crédits',
    /* La seconde lecture porte le reste à placer, et non le taux d'épargne : le
       taux décrit le mois passé, le reste appelle un geste — c'est lui qui fait
       ouvrir l'écran. Le taux s'y lit, à côté de sa ventilation. */
    savingLeft: '%s encore disponibles',
    /* Ce que le mois verse, dit avec ou sans filtre. La condition tombe : elle
       valait pour le *reste à placer*, qui appelle un geste et se décide sur un
       compte à la fois — à plusieurs, la somme de deux restes ne se décide
       nulle part. Le versement, lui, est un constat, et l'écran de l'épargne
       l'additionne déjà pour tout le monde sans que ça pose de question.
       Le mois entier, comme la capacité et le reste qui l'encadrent : les deux
       clauses sont les deux moitiés du chiffre, elles doivent le redonner. Au
       seul confirmé — plus juste sur le mot « versé », et tentant pour ça — il
       manquerait à l'écran ce qui est programmé sans être parti, et l'écran de
       l'épargne annoncerait un autre montant sous le même mot.
       « Versé » et non « placé », comme `savings.placedTotal` et `entry.savingIn` :
       le même geste garde le même mot d'un écran à l'autre.
       Deux versions, parce que l'épargne se compte en net : le mois où une
       avance est posée, le livret rend plus qu'il ne reçoit, et « −510 € versé »
       ne se lit pas — c'est une reprise, elle se nomme. */
    /* « sur le mois » n'est pas un ornement : le chiffre compte les échéances
       encore prévues, et « 400 € versé » posé seul se lit comme un virement
       déjà parti. La clause dit l'horizon, comme celles du prévisionnel et du
       reste à vivre juste au-dessus. */
    savingPlaced: '%s versé sur le mois',
    savingWithdrawn: '%s repris de l’épargne',
    showSavings: 'Voir où placer %s',
    spending: 'Où part l’argent',
    spendingHint: 'charges et crédits, hors épargne',
    credits: 'Crédits',
    creditsRemaining: 'capital restant dû',
    creditsRunningOne: '%s crédit en cours',
    creditsRunningMany: '%s crédits en cours',
    showCredits: 'Voir le détail des %s',
    /* Sur chaque part de l'anneau. La croix seule dirait « ferme », le
       pourcentage seul ne dit pas qu'on peut l'ouvrir : le nom accessible porte
       le geste, et il nomme le poste pour que sept boutons ne s'annoncent pas
       sept fois de la même façon. */
    showFamily: 'Voir les lignes de %s',
    split: 'Répartition',
    splitHint: 'charges communes du mois',
    /* Le nom du lien posé au coin de ces deux tuiles-là, et non celui de leur
       eyebrow : elles ne sont plus cliquables d'un bloc — leur contenu est une
       liste, qu'un bouton aplatirait — et le repère du coin porte seul le
       geste. Un lecteur d'écran sait lister les liens d'une page hors de leur
       contexte : ce nom-ci doit donc tenir tout seul, là où le chevron affiché
       se suffit du voisinage de l'eyebrow. */
    showSplit: 'Voir le détail de la répartition',
    showMemberShare: 'Voir le détail de ce qu’il y a à verser',

    /* La contrepartie de la tuile Répartition, sous un filtre par membre :
       celle-ci montre les parts de tout le monde, celle-là ce que la personne
       filtrée porte du pot commun — et le coefficient qui le produit, qui
       n'apparaissait nulle part sur son mois.

       Le montant à virer est le chiffre de tête, et non une ligne parmi trois.
       C'est le geste que la tuile sert : un virement sur le compte joint, dont
       la somme se recopie telle quelle. Le total des charges communes en est
       parti — c'est un chiffre qu'on ne doit pas, et il se lit encore sur
       l'écran Répartition, qui est fait pour ça.

       **Et elle ne parle plus que du virement.** Elle portait sous ce même
       titre « Charges perso » et « Total à payer », c'est-à-dire deux montants
       qui ne sont pas un virement mais un coût : le report entre dans l'un et
       pas dans les autres, si bien qu'un « Total à payer » s'affichait plus
       petit que le « À verser » posé juste au-dessus. Le coût du mois a
       maintenant sa tuile — voir `memberCharges` —, et celle-ci pose le calcul
       de son propre chiffre, dans les mots de l'écran Répartition : sa part du
       mois, plus la régularisation, égale ce qu'elle verse. */
    /* L'eyebrow nomme le chiffre plutôt que la tuile : un nom de tuile puis
       « À verser sur le commun » juste en dessous disaient deux fois la même
       chose, et cette redite valait les trente pixels qui débordaient. */
    memberShare: 'À verser sur le commun',
    /* Le nom de la région, et le nom du membre avec lui. Il ne s'affiche pas —
       il vient du filtre, que la tuile ne redit pas — et il vivait jusqu'ici
       dans la lecture parlée de l'anneau, partie avec l'anneau : une jauge à
       45,3 % annonçait une fraction du total des charges communes du foyer,
       lequel n'est pas sur cette tuile et n'a pas à y être. Un pourcentage sans
       son « de quoi » ne s'explique pas d'un mot posé à côté ; il se vérifie sur
       l'écran Répartition, contre le revenu dont il sort. */
    memberShareOf: 'À verser sur le commun · %s',

    /* Ce que le mois coûte à la personne filtrée, et la seule chose que ses
       chiffres ne disent jamais : ce qui est à elle, et ce qui est le foyer.
       `scopeToMember` fond les deux dans chaque total — sans quoi elle se
       lirait comme si elle vivait sans loyer —, et une fois fondus plus rien ne
       les sépare : la tuile Charges, « Où part l'argent » et la capacité
       d'épargne annoncent toutes un montant dont on ne sait plus quelle part on
       a choisie.

       Elle ne dit pas un mot du virement, et c'est tout son propos : un coût
       est arrêté au mois où la dépense a eu lieu, un virement se rattrape
       (§4.7 ter). Les mêler dans une carte était l'erreur qu'elle répare. */
    /* « Perso et commun » et non « Charges du mois » : la tuile de flux de la
       même page s'appelle déjà « Charges », et deux étiquettes à un mot près
       pour deux découpes du même montant se lisent comme deux chiffres
       différents. L'eyebrow nomme donc la découpe, et les deux lignes en
       dessous reprennent ses deux mots. Le plafond de 13 caractères ne vaut que
       pour la `2×1`, seule à rester en demi-colonne sur mobile (DS §5). */
    memberCharges: 'Perso et commun',
    memberChargesOwn: 'Charges perso',
    /* Le **même libellé** que la ligne d'« À verser sur le commun », parce que
       c'est le même montant au centime. Sa voisine disait « Sa part du mois » —
       deux noms proches sur deux nombres à vingt-cinq euros l'un de l'autre, et
       rien pour dire lequel était lequel ; elle dit maintenant celui-ci, et ce
       qui les séparait a sa propre ligne.

       Quinze caractères, et c'est un plafond mesuré : la colonne posée à côté
       de l'anneau fait 152px, où « Part des charges communes » se faisait
       tronquer — « Part des … », c'est-à-dire plus rien. Le DS §5 l'interdit, et
       la précision perdue se rattrape sur la ligne d'en dessous et dans la
       feuille, qui ont la place de la dire. */
    memberChargesCommon: 'Part du commun',
    /* La lecture que la feuille pose sous le chiffre : la moitié qui vient du
       foyer, c'est-à-dire celle des deux qu'on ne décide pas seul·e — donc
       celle dont on vient chercher l'explication. */
    memberChargesOfWhich: 'dont %s de part du commun',
    srMemberCharges: '%s de charges pour %s : %s en propre, %s de part du commun.',

    /* Quatre soldes qui se ressemblent à l'œil sans dire la même chose. Chacun
       dit son calcul, puis ce qui le sépare de son voisin — c'est la question
       qu'on se pose devant la grille, pas la définition isolée. */
    explain: 'Comprendre : %s',
    /* Les deux flux, eux, ne s'expliquent pas : ils mènent à leurs lignes. Un
       total dont on peut lire le détail n'a pas besoin qu'on le définisse. */
    showLines: 'Voir les lignes : %s',
    info: {
      /* La phrase avant le calcul : lire d'abord la formule, c'est ouvrir sur
         du vocabulaire qu'on n'a pas encore de quoi comprendre. */
      calculationLabel: 'Le calcul',
      apartLabel: 'Ce qui le distingue',
      balance: {
        lead: 'Ce qui a réellement eu lieu ce mois-ci, et rien d’autre.',
        calculation: 'Les entrées confirmées, moins les sorties confirmées.',
        /* La question la plus fréquente devant ce chiffre est celle de
           l'épargne : elle sort du compte, donc elle pèse ici — et c'est la
           capacité d'épargne qui la remet à part. Sans cette phrase, mettre
           300 € de côté se lit comme 300 € dépensés, sans un mot. */
        apart:
          'Une échéance encore prévue n’y compte pas : elle n’a pas eu lieu. C’est toute la différence avec le prévisionnel, qui les compte. Un versement d’épargne, lui, y compte comme une sortie — l’argent quitte bien le compte ; c’est la capacité d’épargne qui le met à part.',
      },
      forecast: {
        lead: 'Là où le mois atterrit si tout ce qui est prévu se passe comme prévu.',
        calculation: 'Le solde du mois, plus les échéances encore prévues, des deux côtés.',
        apart:
          'Le solde du mois s’en tient à ce qui a eu lieu ; celui-ci y ajoute ce qui doit encore tomber. En début de mois les deux sont très éloignés — c’est normal, presque rien n’a encore eu lieu.',
      },
      remaining: {
        lead: 'Ce dont tu disposes d’ici la prochaine rentrée d’argent, une fois payé tout ce qui tombe avant elle.',
        calculation: 'Le prévisionnel, arrêté la veille de la prochaine rentrée d’argent.',
        apart:
          'C’est le prévisionnel arrêté plus tôt : lui va jusqu’au bout du mois, celui-ci s’arrête au prochain salaire. Sans rentrée en vue, les deux se rejoignent — l’horizon devient la fin du mois.',
      },
      /* Le seul des quatre qui ne soit pas un solde, et il est là pour la
         raison qui a fait les trois autres : deux chiffres voisins qui se
         ressemblent sans dire la même chose. Sa voisine « À verser sur le
         commun » mène à l'écran Répartition, où son calcul est posé ligne à
         ligne ; celle-ci ne mène nulle part — ses deux moitiés viennent de deux
         endroits — et n'avait donc aucun endroit où s'expliquer. */
      memberCharges: {
        lead: 'Ce que le mois t’a réellement coûté : tes dépenses à toi, plus la part du foyer que tes revenus te font porter.',
        calculation:
          'Tes charges et tes crédits à ton nom, plus ta part des charges et des crédits communs — au prorata des revenus. C’est le chiffre de la tuile Charges, au centime : celle-ci ne le contredit pas, elle l’éclate.',
        /* La question exacte qui a fait écrire cette feuille : deux montants
           proches, deux cases d'écart, et l'un plus grand que l'autre sans
           qu'aucun écran ne dise pourquoi. Les deux causes sont nommées, dans
           l'ordre où elles se rencontrent. */
        apart:
          'Ce n’est pas ce que tu verses sur le commun. Le virement porte en plus la régularisation du mois précédent, et la mensualité d’une avance — quand quelqu’un a réglé une dépense du foyer depuis son épargne et que le foyer la lui rembourse. Ces deux-là se virent sans rien coûter au mois : un coût est arrêté au mois où la dépense a eu lieu.',
      },
      /* La capacité d'épargne n'a plus sa feuille : elle ouvre son écran, où le
         calcul est posé terme par terme et suivi de ce qu'il reste à placer.
         Devant un chiffre qui appelle un geste, définir n'était pas la
         réponse. */
    },
    // Le nom accessible compte comme l'anneau : charges et crédits, hors épargne.
    srBreakdown: 'Répartition des charges et des crédits : %s',
  },

  calendar: {
    dayLabel: '%s — %s',
    noEntry: 'aucune échéance',
    oneEntry: '1 échéance',
    someEntries: '%s échéances',
    emptyDay: 'Rien ce jour-là.',
    empty: 'Aucune échéance ce mois-ci.',
    /* Le mois vide d'un document qui n'a encore posé aucune règle. Ce qui
       remplit un calendrier n'est pas une dépense : une dépense ponctuelle ne
       pose rien pour le mois suivant, une récurrence pose toute l'année. Même
       distinction que `month.emptyStart`, dite dans les mots de cet écran. */
    emptyStart:
      'Le mois est vide. Écris une récurrence : c’est elle qui pose les échéances sur le calendrier.',
    more: '+%s',

    /** Le nom de la fenêtre. Reçoit `de(formatYearMonth(ym))` : « d’avril 2026 ». */
    gridLabel: 'Calendrier %s',
    /* Les deux mentions d'une case, ajoutées à son nom accessible : elles disent
       en mots ce que la forme dit à l'œil — un cadre pour aujourd'hui, un
       chiffre atténué pour le voisin. Sans elles, la case ne se lit qu'à la vue,
       et le DS §8 demande l'inverse. */
    dayToday: 'aujourd’hui',
    dayOutside: 'hors du mois affiché',
    /* La ponctuation d'une énumération est une affaire de langue autant que les
       mots qu'elle sépare : elle se range donc ici, et non dans le composant. */
    labelJoin: ', ',

    /* Le compte des prévues d'une case, ajouté à son nom accessible : le
       pointillé d'une pastille est une forme, et une forme ne dit rien toute
       seule (DS §8). Les mêmes mots que la légende, pour que ce qu'on entend et
       ce qu'on lit soient la même chose. */
    onePlanned: 'dont 1 prévue',
    somePlanned: 'dont %s prévues',

    /* La légende de la grille, sous les six semaines. Quatre marques et pas un
       mot pour les nommer : « pas encore confirmée » ne se devine pas derrière
       un contour en pointillés. Les libellés sont ceux des lignes de l'app —
       une échéance est prévue ou confirmée, et le calendrier ne va pas inventer
       un troisième vocabulaire pour les mêmes deux états. */
    legendDone: 'Confirmée',
    legendPlanned: 'Prévue',
    legendToday: 'Aujourd’hui',
    legendDots: 'Une pastille par échéance, à la couleur de sa catégorie.',
    /* La seconde phrase ne se dit que si un « +N » est à l'écran : trois lignes
       de légende sous un mois qui n'en a aucun expliquent une marque qu'on ne
       voit pas. */
    legendMore: 'Le « + » compte celles qui ne tiennent pas dans la case.',

    dayTotal: 'Total du jour',

    /* La légende du pied de feuille. Trois pilules grises de largeur égale au
       bas d'un panneau ont la forme exacte d'un `Segmented` : elles disaient
       trois natures, pas trois gestes. Le verbe se dit une fois, au-dessus
       d'elles — 88px par bouton ne laissent pas la place de le répéter trois
       fois, et c'est déjà ce qui avait fait retirer le « + ». */
    addLead: 'Ajouter',
  },

  month: {
    title: 'Le mois',
    toConfirm: 'À confirmer',
    confirmOne: 'Confirmer',
    /* Le nom accessible d'un bouton de confirmation, qui nomme son échéance :
       treize boutons « Confirmer » se listent treize fois à l'identique dans
       les contrôles d'un lecteur d'écran, et rien ne dit lequel on vise. Le
       libellé visible reste la coche seule — la rangée d'à côté porte le nom. */
    confirmEntry: 'Confirmer %s',
    /* Le second geste de la rangée : il déplie le panneau qui corrige le
       montant, là où le premier confirme le montant prévu tel quel. */
    adjust: 'Ajuster',
    adjustEntry: 'Ajuster %s',
    /* Les deux boutons du pas. Ils ne disent pas « cinq euros » : la devise du
       document se règle, et un libellé qui la nommerait mentirait dès qu'on en
       change. Ce qu'ils font est le sens, pas la somme. */
    adjustLess: 'Diminuer le montant',
    adjustMore: 'Augmenter le montant',
    confirmAmount: 'Confirmer ce montant',
    /* Ce que l'écart devient, dit là où on le crée : un réel plus lourd que le
       prévu ne se perd pas, il se retire du reste à vivre. */
    adjustHint: 'prévu %s · l’écart part dans le reste à vivre',
    /* Le geste s'apprend en le lisant : rien sur une rangée ne dit qu'elle se
       glisse, et le doigt ne découvre pas un fond qu'il faut déplacer de
       quatre-vingt-douze pixels pour voir. La phrase nomme donc aussi les deux
       boutons, qui font exactement la même chose. */
    swipeHint:
      'Glisse une ligne à droite pour la confirmer, à gauche pour ajuster son montant — ou sers-toi des deux boutons de la rangée.',
    done: 'Tout est confirmé pour ce mois.',
    /* Confirmer n'est pas un aller simple. Le geste s'appelle « remettre à
       confirmer » et non « annuler » : « Annuler » est déjà le bouton qui ferme
       une boîte de dialogue, et les deux se seraient répondu dans la même. */
    unconfirm: 'Remettre à confirmer',
    unconfirmed: 'Échéance remise à confirmer',
    unconfirmEntry: 'Remettre %s à confirmer',
    unconfirmAll: 'Remettre le mois à confirmer',
    unconfirmAllConfirm:
      'Les %s échéances confirmées de ce mois repassent dans « À confirmer », avec leurs montants.',
    unconfirmedAll: 'Mois remis à confirmer',
    /* Le nom court, celui que les repères de tuile posent au coin : un repère
       plafonne à 60 % de la largeur de sa tuile (DS §6), et « Le mois, ligne à
       ligne » y serait tranché au milieu d'un mot. */
    entries: 'Ce mois',
    /* Le nom long, en tête de la liste elle-même : elle porte désormais tout le
       mois, prévu compris, et son titre doit le dire. */
    lineByLine: 'Le mois, ligne à ligne',
    empty: 'Rien pour ce mois. Ajoute ta première dépense.',
    /* Le mois vide d'un document qui n'a encore posé aucune récurrence n'est pas
       le mois vide de tout le monde : c'est un amorçage, et le geste qui
       l'amorce n'est pas une dépense. Une dépense ponctuelle ne prévoit rien —
       ce qui fait qu'un mois s'écrit tout seul est ce qui revient. */
    emptyStart:
      'Commence par ce qui revient chaque mois : loyer, salaire, abonnement. Les suivants se rempliront tout seuls.',
    /* L'état d'avant le premier geste : ni ligne, ni règle. */
    nothingYet: 'Rien encore',
    monthIsEmpty: 'Le mois %s est vide',
    justAnExpense: 'Juste une dépense',
    /* La fin visible de la tâche : plus rien n'attend, et la phrase dit quand
       la prochaine échéance tombe — sans quoi « tout est confirmé » ne dit pas
       s'il faut revenir demain ou dans trois semaines. */
    nothingToConfirm: 'Rien à confirmer',
    upToDate: 'Tout est à jour pour %s',
    upToDateNext: 'Prochaine échéance le %s, avec %s — inutile de revenir avant.',
    upToDateNoNext: 'Toutes les lignes sont réelles, et rien d’autre n’est attendu.',
    /* « Défaire la dernière » n'existe pas : une échéance ne garde ni date ni
       ordre de confirmation, donc « la dernière » ne désigne rien de sûr. Le
       bouton renvoie aux lignes, où chacune porte son propre retour. */
    reopenLines: 'Revoir les lignes %s',
    /* Un autre mois que celui qu'on vit : la phrase dit pourquoi rien ne s'y
       confirme, avant qu'on cherche le geste qui n'y est pas. */
    pastNote: 'mois clôturé · tout y est réel, rien n’attend d’être confirmé',
    aheadNote: 'mois à venir · les montants sont ceux que tes règles prévoient',
    groupBy: 'Regrouper par',
    byDay: 'Jour',
    byCategory: 'Catégorie',
    byMember: 'Personne',
    /* Le filtre venu de l'anneau « Où part l'argent ». Il se nomme parce qu'il
       se retire : une liste réduite par un geste fait deux écrans plus haut, et
       qu'aucune commande visible ne défait, se lit comme un mois où il manque
       des lignes. « Poste » plutôt que « famille » — c'est le mot que la tuile
       emploie déjà pour désigner ce que l'anneau découpe. */
    familyFilter: 'Poste :',
    familyFilterClear: 'Retirer ce filtre',
    /* Le sens ne regroupe pas, il filtre. Un axe de plus aurait rendu une
       lecture — deux blocs dont le tableau de bord donne déjà les totaux ;
       un filtre les multiplie, puisqu'il se combine aux trois axes : les
       charges par poste, les revenus par personne, les charges au jour le
       jour. Les mots sont ceux des deux tuiles, juste au-dessus. */
    show: 'Montrer',
    showAll: 'Tout',
    /* Des natures, jamais des sens : un versement d'épargne sort du compte
       mais n'est pas une charge, et une reprise n'est pas un revenu. Les mots
       sont ceux des tuiles — qui comptent par nature et excluent l'épargne —
       et de la saisie, dont l'épargne a sa propre position. */
    showOut: 'Charges',
    showIn: 'Revenus',
    showSaving: 'Épargne',
    showEmptyOut: 'Aucune charge ce mois-ci.',
    showEmptyIn: 'Aucun revenu ce mois-ci.',
    showEmptySaving: 'Aucun mouvement d’épargne ce mois-ci.',
    groupCountOne: '%s ligne',
    groupCount: '%s lignes',
    /* Sur l'en-tête du groupe du jour, quand le mois affiché est le mois
       courant. Un mot, et non un traitement visuel : le DS §8 demande qu'une
       nuance ne porte jamais seule ce qu'elle dit, et « le jour un peu plus
       foncé » n'arrive à personne. */
    today: 'aujourd’hui',
    collapseAll: 'Tout replier',
    expandAll: 'Tout déplier',
    balance: 'Solde',
    forecast: 'Prévisionnel',
    remaining: 'Reste à vivre',
    progress: 'Progression',
    dayOf: 'jour %s sur %s',
  },

  /* La revue — la file du mois, une échéance par carte.

     « La revue » et non « Revue du mois » : le mois est déjà dit par
     l'en-tête d'où l'on vient, et le titre d'un écran n'a pas à répéter le
     contexte qui l'a ouvert.

     Ses deux états vides empruntent leurs phrases à l'écran du mois
     (`month.done`, `month.emptyStart`) : le même fait ne se raconte pas de
     deux façons selon l'endroit d'où on le lit. */
  review: {
    title: 'La revue',
    /* Deux sorties, deux mots, parce qu'elles ne partent pas du même endroit :
       on « quitte la revue » qu'on est en train de faire, on « revient au
       mois » quand il n'y avait rien à faire. */
    quit: 'Quitter la revue',
    back: 'Revenir au mois',

    /* --- La tuile du mois ------------------------------------------------ */

    /* Elle dit deux choses selon l'état : ce qu'il reste à faire, ou où l'on en
       était. « Reprends » au présent, à la deuxième personne : c'est la seule
       phrase de l'app qui s'adresse à quelqu'un qu'on a vu partir. */
    tileTitle: '%s lignes à confirmer',
    tileTitleOne: 'Une ligne à confirmer',
    tileBody:
      'Une par une, trois décisions au plus : c’était bien ça, un autre montant, pas ce mois-ci.',
    resumeAt: 'Reprends à %s sur %s',
    resumeBody: 'La file est intacte, dans le même ordre. Rien n’a été perdu en sortant.',
    start: 'Commencer la revue',
    resume: 'Reprendre la revue',
    restart: 'Repartir du début',
    /* Le nom accessible de la barre de progression : une barre ne dit rien
       toute seule, et le pourcentage qu'elle dessine est déjà écrit à côté en
       toutes lettres (DS §8). */

    /* --- Le fil de la file ----------------------------------------------- */

    counter: '%s/%s',
    counterLong: '%s sur %s · %s après celle-ci',
    counterLongOne: '%s sur %s · une après celle-ci',
    counterLast: '%s sur %s · la dernière',
    /* Le nom accessible d'une rangée de la colonne de gauche. Le saut est un
       geste, pas une lecture : sans verbe, six rangées se listent comme six
       libellés dont rien ne dit ce qu'ils font. */
    goTo: 'Aller à %s',

    /* --- La carte -------------------------------------------------------- */

    /* Le sens de la ligne, en toutes lettres. Les deux mots sont ceux de la
       saisie et des tuiles — un concept garde son nom partout. */
    kindOut: 'Charge',
    kindIn: 'Rentrée d’argent',
    /* La méta de la carte : le jour, puis d'où vient le montant. Deux phrases
       parce que le montant d'une récurrence à montant variable n'est pas prévu,
       il est attendu. */
    metaPlanned: 'prévu le %s',
    metaEstimate: 'prévu le %s · montant à saisir',
    yes: 'C’était bien ça',
    other: 'Un autre montant',
    skip: 'Pas ce mois-ci',
    /* La ligne mono du bas, sur écran large seulement : au doigt, ces deux
       touches n'existent pas. */
    keys: 'Entrée pour confirmer · Échap pour sortir',

    /* --- Le pavé --------------------------------------------------------- */

    padLabel: 'Montant réel',
    padMeta: 'prévu %s · tape le montant réel',
    padMetaEmpty: 'aucun montant prévu · tape le montant réel',
    padConfirm: 'Confirmer %s',
    padBack: 'Revenir au prévu',

    /* --- Ce que chaque geste écrit --------------------------------------- */

    /* Trois messages, et ils ne promettent pas la même chose, parce que le
       document ne fait pas la même chose. Une récurrence à montant fixe garde
       sa règle : confirmer une échéance à 104,20 € ne réécrit pas les mois
       suivants. Une récurrence à montant variable, elle, n'a pas de montant :
       ce sont ses échéances chiffrées qui font foi, et celle qu'on vient
       d'écrire devient la plus proche. Une ligne sans récurrence ne promet
       rien du tout — il n'y a pas de suite. */
    padNoteFixed: 'la règle ne bouge pas · seule cette échéance change',
    padNoteVariable: 'les prochaines échéances reprendront ce montant',
    /* « Retirée » et non « supprimée » : le mot dit ce qui s'est passé — la
       ligne quitte ce mois-là. Et la suite est vraie, elle : modifier la règle
       replanifie toutes ses échéances prévues, celle-ci comprise. */
    skipped: 'Ligne retirée de ce mois · elle reviendra si tu modifies la règle',

    /* --- Le bilan -------------------------------------------------------- */

    summaryEyebrow: '%s · tout est passé en revue',
    summaryIn: 'Revenus confirmés',
    summaryOut: 'Charges confirmées',
    summarySaved: 'Mis de côté',
    summaryLines: 'Lignes passées',
    summaryLinesValue: '%s lignes',
    summaryLinesOne: '%s ligne',
    summaryBalance: 'Solde réel %s',
    /* L'écart au prévu. « Exactement » plutôt qu'un zéro : un écart nul est le
       seul des trois qui mérite d'être lu comme une nouvelle. */
    gapNone: 'exactement le prévu',
    gapUnder: 'sous le prévu',
    gapOver: 'au-dessus du prévu',
    /* Le bouton ne ferme rien dans le document — un mois n'a pas de verrou, et
       la phrase le dit plutôt que de le taire. Il navigue vers le mois suivant,
       que l'app ouvre toute seule en y arrivant. */
    close: 'Fermer %s',
    closeHint: 'un mois fermé reste modifiable — rien n’est verrouillé',

    /* --- Le mois suivant ------------------------------------------------- */

    nextTitle: 'Le mois %s est déjà rempli',
    nextBody:
      '%s lignes reprises de tes récurrences, au montant prévu. Tu confirmeras au fil de l’eau, ou d’un coup à la fin.',
    nextBodyOne:
      'Une ligne reprise de tes récurrences, au montant prévu. Tu la confirmeras quand elle sera tombée.',
    /* Aucune ligne : c'est le mois d'un foyer sans récurrence, et le dire vaut
       mieux qu'un titre qui annonce un mois « déjà rempli » sur une liste vide. */
    nextEmpty: 'Le mois %s n’attend aucune ligne',
    nextEmptyBody:
      'Aucune récurrence n’y tombe. Écris une fois ce qui revient, et le mois s’ouvrira rempli.',
    /* Au-delà de douze mois, l'app n'ouvre plus rien : écrire toutes les
       échéances de toutes les règles est définitif, et la borne existe pour que
       la navigation ne se repousse pas elle-même. Le bilan reste, la porte non. */
    nextBeyond: 'Le mois suivant est au-delà de ce que l’app écrit à l’avance.',
    nextOpen: 'Ouvrir %s',
    nextDone: 'Tu as fini pour %s. Rien d’autre à faire ici.',
  },

  /* Le pavé numérique. À part de la revue : l'onboarding et la saisie rapide
     le montent aussi, et une chaîne rangée sous « revue » les ferait parler
     d'un écran où elles ne sont pas. */
  keypad: {
    erase: 'Effacer le dernier chiffre',
    hint: 'tape au clavier si tu préfères',
  },

  /* Revenus & charges — le détail au bout des deux tuiles du mois.

     L'esperluette est celle du titre affiché : deux choses de même rang,
     lues d'un seul tenant. */
  flows: {
    title: 'Revenus & charges',
    empty:
      'Le mois ne contient aucune ligne. Écris une récurrence, et le détail se remplira tout seul.',
    in: 'Ce qui rentre',
    out: 'Ce qui sort',
    /* L'autre vide : le mois porte des lignes, mais aucune ne passe le filtre
       en cours — le pot commun d'un mois sans charge partagée, ou quelqu'un
       qui n'a rien à son nom. Sans action : la rangée de pilules juste
       au-dessus est ce qui la défait, et « écris une récurrence » serait faux
       sur un mois qui en a déjà. */
    filtered: 'Rien à détailler sous ce filtre. Le mois, lui, n’est pas vide.',
    /* Les trois sections du détail. « Ce qui sort » reste : la tuile Charges du
       mois le dit, et l'écran le découpe en deux — ce que le foyer paie
       ensemble, et ce que chacun paie seul. */
    common: 'Charges communes',
    own: 'Charges personnelles',
    /* L'épargne n'est ni un revenu ni une charge, et elle a pourtant sa
       section : sans elle, un écran qui détaille le mois tairait des lignes que
       la liste du mois montre. */
    saving: 'Mis de côté',
    /* Ce qu'une ligne dit quand la portée l'a découpée : la part qu'on lit, et
       le montant plein dont elle vient. Reçoit `de(prénom)` puis le montant —
       « part d’Alice sur 1 100,00 € ». Le découpage est celui de `split.ts`,
       jamais une multiplication faite à l'écran. */
    share: 'part %s sur %s',
    /* La règle qui produit les parts, sous les charges communes. Les
       pourcentages la suivent, séparés par des points médians. */
    commonRule: 'Au prorata des revenus',
    /* La portée de la tuile de tête, accolée au libellé du solde : « Reste à
       vivre du foyer », « Reste à vivre d’Alice ». Le prénom passe par `de()`,
       qui élide ; le foyer n'a pas de prénom, d'où cette chaîne-ci. */
    scopeHousehold: 'du foyer',
  },

  entry: {
    addOut: 'Ajouter une dépense',
    addIn: 'Ajouter un revenu',
    /* Formes courtes des barres d'action, où les deux sens tiennent côte à
       côte. Le sens ne se devine plus derrière un libellé unique. */
    newOut: 'Dépense',
    newIn: 'Revenu',
    editOut: 'Modifier la dépense',
    editIn: 'Modifier le revenu',
    addedOut: 'Dépense ajoutée',
    addedIn: 'Revenu ajouté',
    updatedOut: 'Dépense modifiée',
    updatedIn: 'Revenu modifié',
    removedOut: 'Dépense supprimée',
    removedIn: 'Revenu supprimé',
    remove: 'Supprimer l’entrée',
    removeConfirm: 'Elle disparaît du mois et de l’historique, sans retour. Supprimer ?',
    amount: 'Montant',
    category: 'Catégorie',
    date: 'Date',
    label: 'Libellé',
    /* Les exemples suivent le rythme, et rien d'autre : « Courses » n'est pas
       ce qu'on saisit en récurrent, « Loyer » pas ce qu'on saisit à la main
       chaque mois. Le champ, son libellé et sa validation ne bougent pas — un
       exemple qui colle est une aide, deux formulaires n'en sont pas une. */
    labelPlaceholder: 'Courses',
    labelPlaceholderRecurring: 'Loyer',
    categoryPlaceholder: 'Choisis une catégorie',
    shared: 'Charge commune, à partager entre les membres',
    sharedHint: 'Elle entre dans la répartition au prorata des revenus.',
    /* Sur « en commun », la case ne se décoche pas : une charge que personne
       ne s'attribue est commune par règle, et la décocher sans dire à qui elle
       est la ferait sortir du compte sans apparaître dans le mois de
       personne. La case reste, cochée, pour dire ce qui se passe. */
    sharedLocked: 'Personne ne s’attribue cette ligne : elle est commune, et se répartit au prorata.',
    member: 'Membre',
    note: 'Note',
    /* Le champ existait dans le brouillon et partait bien à l'enregistrement,
       mais l'écran ne le montrait nulle part : la note se lit sur la ligne du
       mois et se cherche depuis l'historique, et rien ne permettait d'en
       écrire une. Le formulaire de récurrence, lui, l'a toujours posée. */
    notePlaceholder: 'Payé en liquide',
    notePlaceholderRecurring: 'Résiliable en ligne',
    direction: 'Sens',

    /* L'écran demande ce qu'on enregistre, pas le sens de trésorerie : verser
       200 € sur un livret sortait du compte, donc se saisissait par
       « Dépense », et il fallait aller chercher « Livrets » entre les courses
       et le carburant. On ne dépense pas son épargne, on la déplace. */
    nature: 'Nature',
    natureExpense: 'Dépense',
    natureIncome: 'Revenu',
    natureSaving: 'Épargne',
    savingMovement: 'Mouvement',
    /* Dit du point de vue de l'épargne, pas du compte courant : « je place »
       et « je reprends » se comprennent sans savoir dans quel sens l'argent
       traverse. Le second n'existait pas — on pouvait verser sur un livret,
       jamais y reprendre. */
    savingIn: 'Je place',
    savingOut: 'Je reprends',
    addSaving: 'Mouvement d’épargne',
    /* Le pendant verbal d'`addSaving`, pour un bouton dont le texte visible se
       réduit à « Épargne » : le nom accessible doit dire le geste, et contenir
       le libellé visible (DS §6). */
    addSavingAction: 'Ajouter un mouvement d’épargne',
    editSaving: 'Modifier le mouvement',
    addedSaving: 'Mouvement d’épargne enregistré',
    updatedSaving: 'Mouvement d’épargne modifié',
    removedSaving: 'Mouvement d’épargne supprimé',
    newSaving: 'Épargne',
    amountRequired: 'Indique un montant supérieur à zéro.',
    categoryRequired: 'Choisis une catégorie.',
    labelRequired: 'Donne un libellé à cette entrée.',
    /* Le même message, dit de ce qu'on enregistre : « cette entrée » sous un
       écran qui pose une règle laissait croire à deux formulaires. */
    labelRequiredRecurring: 'Donne un libellé à cette récurrence.',
    /* Sans propriétaire ni partage, la ligne n'apparaîtrait dans le mois de
       personne, et la somme des soldes cesserait de valoir le solde total. */
    memberRequired:
      'Dis à qui est cette ligne : elle n’entre pas dans les charges communes, donc sans propriétaire elle n’apparaîtrait dans le mois de personne.',
    /* Une récurrence pose une échéance par période : le trou se creuse à
       chaque fois, et c'est ce que la phrase ajoute. */
    memberRequiredRecurring:
      'Dis à qui est cette récurrence : elle n’entre pas dans les charges communes, donc sans propriétaire ses échéances n’apparaîtraient dans le mois de personne.',

    /* Ponctuel ou récurrent — la bascule du cahier §4.4. */
    rhythm: 'Rythme',
    once: 'Ponctuel',
    recurring: 'Récurrence',
    firstDate: 'Première échéance',
    /* Ce qu'il advient de la première échéance, et il n'y a que deux réponses.
       Elles ne dépendent pas de la porte par laquelle on est arrivé mais de la
       seule chose qui compte : a-t-elle eu lieu ? Une échéance datée d'hier ou
       d'aujourd'hui, dont le montant est fixe, oui. Une échéance à venir, ou
       dont le montant reste à saisir, non.
       « chaque mois » était d'ailleurs écrit en dur sous un champ qui propose
       aussi la semaine, le trimestre et l'année : la phrase mentait dès qu'on
       choisissait autre chose qu'une mensuelle. */
    firstDatePaid: 'Celle-ci est enregistrée comme payée ; les suivantes arriveront à confirmer.',
    firstDatePlanned: 'Elle arrivera à confirmer, comme les suivantes.',

    /* Jusqu'où porte la correction d'une échéance générée — la question que le
       formulaire ne posait pas : corriger le loyer d'août laissait septembre
       sur l'ancien prix, et rien à l'écran ne disait lequel des deux gestes on
       venait de faire. La coupure est la même que `recurrences.amountAhead`,
       dite avec les mêmes mots : à partir des échéances à venir, jamais les
       mois déjà confirmés. */
    editScope: 'Portée de la modification',
    scopeOccurrence: 'Cette échéance',
    scopeRule: 'Toute la règle',
    scopeOccurrenceHint: 'Seule cette échéance change — la règle et les suivantes ne bougent pas.',
    scopeRuleHint:
      'Le libellé, la catégorie, la personne, le partage et le montant passent sur la règle, à partir des échéances à venir — les mois déjà confirmés ne changent pas. La date, le statut et la note restent à cette échéance.',
    /* Une règle à montant variable laisse chaque échéance chiffrer la sienne :
       lui écrire le montant du mois la changerait de nature. */
    scopeRuleHintVariable:
      'Le libellé, la catégorie, la personne et le partage passent sur la règle, à partir des échéances à venir — les mois déjà confirmés ne changent pas. Le montant, la date, le statut et la note restent à cette échéance.',
    updatedRule: 'Règle modifiée — les échéances à venir suivent',
    /* Ce que le mois dégage encore, dit **au moment de placer** — c'est là que
       la question se pose, et jusqu'ici elle n'avait de réponse que sur le
       tableau de bord, deux écrans plus loin. Même calcul et même mois que la
       tuile « Capacité d'épargne » (`domain/stats.savingLeft`), échéances
       prévues comprises : deux chiffres qui se contrediraient seraient pires
       que le second absent.
       Trois phrases parce qu'il y a trois situations, et qu'un « 0 € encore
       disponibles » ne dit pas la même chose qu'un dépassement. */
    savingRoom: 'Ce mois-ci, %s restent à placer.',
    savingRoomOver: 'Ce mois-ci, les versements dépassent déjà la capacité de %s.',
    savingRoomNone: 'Ce mois-ci, les charges dépassent les revenus : il n’y a rien à placer.',
    /* En montant variable, le champ ne chiffre plus la règle — elle n'en fixe
       aucun — mais ce qu'on lui prête en attendant. */
    variableAmountHint:
      'Le montant sera demandé à chaque échéance. Celui-ci sert d’ordre de grandeur en attendant — pour le total des récurrences, et pour la répartition au prorata s’il s’agit d’un revenu. Chaque échéance chiffrée prend aussitôt le dessus.',

    /* Un seul écran de saisie, donc un seul titre : la nature et le rythme s'y
       changent d'un doigt, et un titre qui suivrait les six combinaisons
       donnerait l'impression d'avoir changé d'écran sans bouger. Ce qu'on
       enregistre se lit sur les bascules, juste dessous.
       Le bouton, lui, nomme ce qui va être créé : c'est le dernier endroit où
       le dire, et le seul qui ne change plus rien après. */
    /* --- La saisie rapide -------------------------------------------------
       Un écran plein, et non la feuille du prototype : le DS §6 réserve la
       feuille à ce qui se lit et se referme, et celle-ci écrit. */
    quickFull: 'Plus de détails',
    /* La phrase du design, mot pour mot : ce que la saisie engage, dit là où on
       la fait. C'est la contrepartie exacte de « rien ne sort d'ici ». */
    quickPrivacy: 'enregistré dans ce navigateur · rien ne part ailleurs',

    addOperation: 'Ajouter une opération',
    saveOperation: 'Ajouter l’opération',
    saveRecurrence: 'Ajouter la récurrence',
  },

  /* Écrire une règle en quelques cartes — le chemin rapide du handoff.
   *
   * Un bloc à part de `recurrences` parce que c'est un **parcours**, pas une
   * lecture : il a son avancement, ses questions et ses erreurs, comme la
   * revue. Ce qu'il partage avec le formulaire — « Montant », « Catégorie »,
   * « Membre », leurs messages — se lit sous `entry`, et n'est pas recopié :
   * un même champ ne se nomme pas de deux façons selon la porte. */
  quickRule: {
    title: 'Écrire une règle',
    quit: 'Abandonner',
    counter: '%s / %s',
    /* « Revenir » et non « Retour » : le second est le chevron d'en-tête, qui
       quitte l'écran ; celui-ci recule d'une carte sans rien perdre. */
    back: 'Revenir',
    write: 'Écrire la règle',
    steps: {
      what: {
        title: 'Qu’est-ce qui revient ?',
        body: 'Prends un cas courant, ou donne-lui simplement un nom. L’un ou l’autre suffit.',
      },
      amount: { title: 'Combien ?', body: 'Le montant de chaque échéance.' },
      when: { title: 'Quel jour ?', body: 'Le jour du mois où elle tombe.' },
      details: {
        title: 'Voilà ce que ça donne',
        body: 'Relis, et corrige si quelque chose ne va pas.',
      },
    },
    kindsLabel: 'Ce qui revient',
    /* Les cinq cas les plus courants. Chacun désigne une **vraie** catégorie du
       catalogue, et disparaît si elle a été supprimée : une règle posée sur un
       identifiant mort se rangerait n'importe où. */
    kindRent: 'Un loyer',
    kindSubscription: 'Un abonnement',
    kindSalary: 'Un salaire',
    kindLoan: 'Une échéance de crédit',
    kindSaving: 'Un virement d’épargne',
    /* Le nom que la ligne portera. La puce pose une question — « Un loyer » —,
       la ligne du mois répond — « Loyer ». */
    nameRent: 'Loyer',
    nameSubscription: 'Abonnement',
    nameSalary: 'Salaire',
    nameLoan: 'Crédit',
    nameSaving: 'Épargne',
    name: 'Son nom, si tu veux le préciser',
    namePlaceholder: 'Mutuelle, cantine, forfait mobile…',
    whatRequired: 'Choisis un cas, ou donne un nom à la règle.',
    dayShortcuts: 'Jours les plus courants',
    dayRequired: 'Le jour doit être compris entre 1 et 31.',
    /* Le repli de la dernière carte. Ce qui est déjà juste n'a pas à être
       redemandé ; ce qui manque ouvre le repli tout seul. */
    details: 'Précisions',
    noCategory: 'à choisir',
    /* La sortie vers le formulaire, offerte tant que rien n'est saisi : sept
       cadences, le montant variable, la date de fin, le support d'épargne et la
       note n'ont pas de carte ici. */
    fullForm: 'Ouvrir le formulaire complet',
    foot: 'Trois questions, et la règle remplira chaque mois toute seule.',
    footDetails: 'Cadence, date de fin, note : tout se règle ensuite depuis sa fiche.',
  },

  recurrences: {
    title: 'Récurrences',
    add: 'Ajouter une récurrence',
    edit: 'Modifier la récurrence',
    added: 'Récurrence ajoutée',
    updated: 'Récurrence modifiée',
    resumed: 'Récurrence reprise',
    deleted: 'Récurrence supprimée',
    empty: 'Aucune récurrence pour l’instant. Ajoute la première.',
    /* La seule porte des crédits était une tuile du mois qui se retire tant
       qu'aucun crédit n'est suivi : on ne pouvait donc jamais créer le premier.
       Elle est ici, parce que c'est une récurrence qui pose les mensualités.

       Sur une rangée et non plus sous un paragraphe : la phrase disait pourquoi
       le lien était là — « une mensualité de crédit est une récurrence comme
       une autre » — ce qui explique le voisinage et non la destination. Une
       rangée n'a de place que pour la seconde, et c'est la seule des deux qu'on
       lise en cherchant où aller. */
    creditsHint: 'Suivre le capital qu’il reste à devoir',
    stoppedBadge: 'Arrêtée',
    cappedBadge: 'Plafond atteint · en attente de place',
    nextDue: 'Prochaine échéance',
    noNextDue: 'Plus d’échéance',
    monthlyCost: 'Par mois',
    annualCost: 'Par an',
    perYear: '%s par an',
    /* Le total suit la pastille : un total qui ne compterait que les sorties
       sans le dire décrirait mal la liste qu'il surplombe.

       **C'est l'étiquette qui dit ce qu'on additionne**, et non plus une phrase
       posée sous le chiffre. « Total par mois » sur une somme qui exclut les
       revenus est un mot juste pour un périmètre faux : il fallait lire les
       soixante-dix caractères de la ligne du dessous pour savoir que c'était
       celui des sorties. Le DS §6 le dit d'ailleurs — la tuile n'a pas de
       titre, elle a une étiquette, et une étiquette nomme son chiffre. Les
       quatre mots sont ceux de l'app : le pluriel de « Sortie », et les trois
       libellés des pilules. */
    totalOut: 'Sorties par mois',
    totalSpending: 'Charges par mois',
    totalIn: 'Revenus par mois',
    totalSaving: 'Épargne par mois',
    /* Ce que l'étiquette ne dit pas : de qui, et ce que le mot recouvre. Cette
       page ne connaît pas le filtre par membre — elle montre les règles du
       foyer, pas un mois. En lecture tertiaire, sous l'annuel : c'est une
       vérification, pas une lecture. */
    scopeOut: 'Tout le monde · épargne et crédits compris',
    /* Sous une pilule, le total se borne à sa nature : « Charges » compte
       comme la tuile du même nom — sans l'épargne — et l'épargne se compte en
       net, reprises déduites, comme partout. */
    scopeSpending: 'Tout le monde · épargne à part',
    scopeIn: 'Tout le monde',
    scopeSaving: 'Tout le monde · reprises déduites',
    groupBy: 'Regrouper par',
    byCategory: 'Catégorie',
    byMember: 'Personne',
    /* L'ordre était toujours imposé par le domaine — par prochaine échéance,
       qui répond à « qu'est-ce qui tombe bientôt ». C'est cet écran qui porte
       l'autre question : « qu'est-ce qui me coûte le plus ».

       Le tri passe de la bascule au sélecteur, et change donc de mot : la
       bascule montrait ses deux positions et se faisait lire comme un troisième
       choix d'affichage, à côté de l'axe et des pilules. « Trier » est le
       libellé visible du sélecteur, donc son nom accessible ; « Trier par »
       demandait une ligne à lui seul pour deux mots. */
    sortBy: 'Trier',
    byDue: 'Échéance',
    byAmount: 'Montant',
    /* Le sens ne regroupe pas, il filtre — la règle qu'applique déjà la liste
       du mois. En axe, il rendait deux blocs dont le total en tête de page
       donne déjà les chiffres ; en filtre, il se combine aux deux axes qui
       restent : les charges par poste, les revenus par personne. Les mots sont
       ceux de la page du mois, à la lettre. */
    show: 'Montrer',
    showAll: 'Tout',
    /* Des natures, comme sur la liste du mois : la mensualité d'épargne n'est
       pas une charge, elle a sa pilule. */
    showOut: 'Charges',
    showIn: 'Revenus',
    showSaving: 'Épargne',
    showEmptyOut: 'Aucune charge récurrente.',
    showEmptyIn: 'Aucun revenu récurrent.',
    showEmptySaving: 'Aucune récurrence d’épargne.',
    /* La sortie du filtre, à côté de la phrase qui dit qu'il ne laisse rien.
       Les pilules sont juste au-dessus et « Tout » en fait partie, mais une
       liste vide est exactement le moment où l'on ne cherche plus quel contrôle
       a produit ça — on veut revenir. */
    showAllBack: 'Voir tout',
    groupCountOne: '%s récurrence',
    groupCount: '%s récurrences',
    collapseAll: 'Tout replier',
    expandAll: 'Tout déplier',
    /* Un groupe dont *tout* n'est pas variable affiche un total, et ce total est
       incomplet : il le dit à côté de son compte, faute de quoi le chiffre se
       croit exact. Un groupe entièrement variable, lui, n'a pas de chiffre du
       tout — c'est `variable` qui prend la place du montant. */
    groupVariable: '%s variable',
    /* Ce que le total de tête laisse de côté, et pourquoi il n'est pas rond.
       « non chiffré » disait l'état de la récurrence ; « non compté » dit ce
       qu'il advient du total, qui est la question qu'on se pose devant lui. */
    variableExcludedOne: '%s montant variable non compté',
    variableExcluded: '%s montants variables non comptés',
    variable: 'Montant variable',
    fixedAmount: 'Montant fixe',
    priceChanged: 'Le prix a changé : %s → %s',
    // Un virement d'épargne n'a pas de prix : son montant change, sans alarme.
    amountChanged: 'Le montant a changé : %s → %s',
    priceChangedSince: 'depuis le %s',
    stop: 'Arrêter la récurrence',
    stopAction: 'Arrêter',
    stopConfirm:
      'Ses échéances à venir sont retirées, les confirmées restent, et la récurrence pourra être reprise. Arrêter ?',
    stopped: 'Récurrence arrêtée',
    resume: 'Reprendre la récurrence',
    remove: 'Supprimer la récurrence',
    /* Les deux moitiés, parce que l'ancienne copie n'en disait qu'une : la
       règle disparaît vraiment de la liste, et ce qui a été payé reste. */
    removeConfirm:
      'La récurrence disparaît avec ses échéances à venir. Celles déjà confirmées restent dans l’historique.',
    stopHint: 'Les échéances déjà confirmées restent dans l’historique.',

    /* --- Les gestes de la rangée -----------------------------------------
       Le glissé se comporte ici comme sur la liste du mois : à droite ce qui
       corrige, à gauche ce qui retire. La phrase l'apprend, et nomme les deux
       boutons qui font exactement la même chose — rien sur une rangée ne dit
       qu'elle se glisse. */
    swipeHint:
      'Glisse une règle à droite pour changer son montant, à gauche pour la retirer — ou sers-toi des deux boutons de la rangée.',
    changeAmount: 'Changer le montant',
    /* Les noms accessibles nomment la règle : douze boutons « Supprimer » se
       listent douze fois à l'identique dans les contrôles d'un lecteur
       d'écran, et rien n'y dirait lequel on vise. L'élision passe par `de()`,
       qui écrit « d’Électricité » là où le gabarit ne peut pas le savoir. */
    changeAmountOf: 'Changer le montant %s',
    removeOf: 'Supprimer la récurrence %s',
    /* Ce que l'enregistrement change, et jusqu'où. La maquette écrivait « à
       partir de septembre » ; `syncRecurrenceEntries` ne touche jamais une
       confirmée et refait les prévues datées **après aujourd'hui**. La coupure
       est donc le jour même, et une échéance de ce mois-ci encore à confirmer
       suivra le nouveau montant. */
    amountAhead: 'à partir des échéances à venir · les mois déjà confirmés ne changent pas',
    /* La sortie douce, offerte au moment exact où l'on s'apprête à supprimer :
       c'est presque toujours le bon geste — on résilie un abonnement, on ne
       l'efface pas — et il n'était offert que deux écrans plus loin. */
    stopInstead:
      'Tu résilies plutôt ? L’arrêter garde tout ce qui a déjà été payé, et la règle pourra être reprise.',

    /* Le geste inverse de « Ajouter une récurrence » : on découvre qu'une
       règle posée par erreur, ou devenue sans objet, ne se répète pas. Deux
       issues bien distinctes, et la question le dit avant qu'on la pose —
       voir `updates.convertsToSingleEntry`. */
    convertToOneTime: 'Changer en ponctuel',
    convertToOneTimeConfirmSingle:
      'Elle devient une ligne ponctuelle, à la même date et au même montant. Rien d’autre ne change.',
    convertToOneTimeConfirmHistory:
      'La récurrence s’arrête. Les échéances déjà confirmées deviennent des lignes ponctuelles indépendantes ; celles seulement prévues disparaissent.',
    convertToOneTimeAction: 'Changer',
    convertedToEntry: 'Devenue ponctuelle',
    /* Pourquoi le bouton n'est pas là : la règle se lit, elle ne se devine pas
       à son absence — même principe que `savings.removeBlocked`. */
    convertToOneTimeBlocked:
      'Elle pose la mensualité d’un crédit ou reconstitue une avance : elle se change depuis cette fiche-là.',
    /* Le geste inverse : une entrée ponctuelle qu'on a saisie une fois, mais
       qui en réalité se répète. */
    convertedFromEntry: 'Devenue récurrence',
    /* Ce que la périodicité seule demande. Tout le reste du formulaire — le
       libellé, le montant, la catégorie, le membre, la note et leurs messages —
       vit sous `entry` : la saisie n'a qu'un écran, elle n'a donc qu'un jeu de
       mots. Ce bloc-ci en avait un second, mot pour mot le même à trois nuances
       près, et chaque correction n'en corrigeait qu'un. */
    form: {
      amountKind: 'Type de montant',
      period: 'Périodicité',
      everyWeeks: 'Toutes les combien de semaines',
      everyMonths: 'Tous les combien de mois',
      everyYears: 'Tous les combien d’années',
      weekday: 'Jour de la semaine',
      monthDay: 'Jour du mois',
      startedOn: 'Première échéance',
      note: 'Note',
      /* La seconde phrase n'est pas une redite de la première : elle dit le
         geste. Le jour est borné et jamais reporté, si bien que 31 *est* « le
         dernier jour » — encore fallait-il que quelqu'un l'écrive, plutôt que
         de laisser deviner qu'on demande la fin du mois en saisissant 31. */
      monthDayHint:
        'Un jour qui n’existe pas est ramené au dernier jour du mois. Saisis 31 pour dire « le dernier jour », quel que soit le mois.',
    },
    periods: {
      weekly: 'Hebdomadaire',
      /* Le rythme d'une paie sur deux et de bien des prélèvements. Le modèle le
         portait depuis toujours ; seul le formulaire ne savait pas le dire. */
      everyNWeeks: 'Toutes les n semaines',
      monthly: 'Mensuelle',
      quarterly: 'Trimestrielle',
      yearly: 'Annuelle',
      everyNMonths: 'Tous les n mois',
      everyNYears: 'Tous les n ans',
    },
    summary: {
      weekly: 'chaque %s',
      everyNWeeks: 'le %s, toutes les %s semaines',
      monthly: 'le %s de chaque mois',
      everyN: 'le %s, tous les %s mois',
      yearly: 'chaque année le %s',
      everyNYears: 'tous les %s ans, le %s',
      /* Un jour d'échéance au 31 *est* le dernier jour du mois : il tombe le 31
         en janvier, le 28 en février et le 30 en avril, parce que le jour est
         borné et jamais reporté. Annoncer « le 31 de chaque mois » sur une
         échéance qui tombe le 28 décrivait la saisie, pas ce qui se passe. */
      lastDay: 'dernier jour',
    },
  },

  split: {
    title: 'Répartition',
    subtitle: 'Ce que chacun verse sur les charges communes, au prorata des revenus.',
    /* Seul·e, « au prorata des revenus » n'explique rien : la part vaut 100 %
       et n'a demandé aucun revenu. L'écran garde sa raison d'être — le pot se
       vérifie ligne à ligne. */
    subtitleSolo: 'Tu es seul·e ici : tu portes tout le commun, ta part vaut 100 %.',
    total: 'Charges communes',
    totalHint: 'échéances prévues comprises',
    due: 'À verser',
    income: 'Revenu',
    checkTotal: 'Total des parts',
    checkHint: 'La somme des parts vaut le total au centime près.',
    detail: 'Ce qui est partagé',
    detailCountOne: '%s ligne',
    detailCount: '%s lignes',
    collapseAll: 'Tout replier',
    expandAll: 'Tout déplier',
    advancedBy: 'avancé par %s',
    /* Le report du mois précédent. Une charge commune réglée par une seule
       personne lui fait porter plus que sa part : le mois suivant le rattrape,
       l'un verse un peu plus, l'autre un peu moins. */
    /* Le « de » vit dans le mois, pas dans le gabarit : « d'octobre » et
       « de septembre » ne s'écrivent pas pareil — c'est `SplitPage` qui l'élide,
       comme il le fait déjà pour les prénoms. */
    settlement: 'Régularisation %s',
    /* « Sa part du mois » nommait la part du pot entier, et la tuile « Perso et
       commun » nommait « Part du commun » la part qui coûte : deux libellés
       presque identiques, deux montants à vingt-cinq euros l'un de l'autre, et
       rien pour dire lequel était lequel. Celui-ci dit ce qu'il compte —
       les charges communes —, et il porte le même nombre que la ligne de la
       tuile Charges décomposée. Ce qui les séparait a maintenant sa ligne. */
    settlementShare: 'Part du commun',
    /* La mensualité d'une avance : la ligne qui expliquait l'écart sans jamais
       s'afficher. Elle ne se lit qu'aux mois où elle existe — c'est-à-dire
       presque jamais, ce qui est exactement pourquoi son absence coûtait si
       cher à comprendre. */
    settlementRefund: 'Remboursement d’avance',
    settlementDetail: 'Ce qui a été avancé en %s',
    settlementHint:
      'Ces charges communes ont été réglées par une seule personne. Chacun en portait sa part : le mois se rattrape ici, et la somme des versements vaut toujours le total.',
    /* Le report ne déplace pas un coût : ce que le mois a coûté à chacun est
       arrêté au mois où la dépense a eu lieu. Ce qui se rattrape est un
       virement, et c'est pour ça qu'il ne touche à aucun total de charges. */
    settlementNotACost:
      'Un report ne change pas ce que le mois a coûté à quelqu’un, seulement ce qu’il verse.',
    method: 'Comment c’est calculé',
    methodFormula: 'Part de chacun = son revenu ÷ la somme des revenus.',
    /* Le revenu est dérivé des récurrences de ressources, jamais déclaré à
       part : une seconde vérité finirait par diverger de la première. */
    methodIncome:
      'Le revenu vient des récurrences de salaire et d’allocation de chacun, ramenées au mois. Une prime ponctuelle ne le déplace pas — elle a lieu, mais elle ne dit rien de ce qu’on gagne.',
    methodVariable:
      'Un salaire à montant variable vaut sa dernière échéance chiffrée, à défaut son montant habituel. Une récurrence laissée « en commun » ne compte dans le revenu de personne.',
    methodIncluded: 'Les charges et les crédits que personne ne s’est attribués.',
    methodFlagged: 'Les dépenses cochées « à partager ».',
    /* La phrase disait « l'épargne n'est pas partagée », sans réserve — et le
       jeu d'exemple la contredit à chaque mois : la mensualité qui reconstitue
       un livret après une avance est de nature épargne *et* cochée « à
       partager », puisque le foyer rembourse celui qui a avancé. C'est
       `createAdvance` qui la pose ainsi, donc l'app elle-même. La règle
       générale reste vraie ; l'exception, elle, était la seule ligne du pot que
       rien n'expliquait, et c'est aussi elle qui fait qu'un virement peut
       dépasser ce que le mois a coûté. */
    methodExcluded:
      'L’épargne n’est pas partagée : elle sort du compte, mais elle reste à qui la met de côté.',
    methodAdvance:
      'Une exception : quand quelqu’un a réglé une dépense du foyer depuis son épargne, la mensualité qui la lui rembourse est partagée. Elle se verse sans rien coûter au mois — c’est pourquoi un virement peut dépasser ce que le mois a coûté.',
    nothing: 'Aucune charge commune ce mois-ci.',
    /* Ce qui manque est nommé plutôt que remplacé par un zéro : un prorata au
       dénominateur incomplet ne vaut pas zéro, il ne veut rien dire. */
    /* Le « de » vit dans le nom, pas dans le gabarit : « d'Alice » et
       « de Camille » ne s'écrivent pas pareil, et la phrase ne peut pas
       en décider — c'est `SplitPage` qui l'élide. */
    missingOne: 'Ajoute le revenu %s pour répartir les charges.',
    missingMany: 'Ajoute les revenus %s pour répartir les charges.',
    /* Chacun porte bien une ressource, mais toutes à zéro : personne n'est à
       nommer, et le prorata n'a pas de dénominateur pour autant. */
    missingNone: 'Ajoute un revenu à chacun pour répartir les charges.',
    missingHint:
      'Une récurrence de salaire ou d’allocation à son nom suffit. À montant variable, elle se lit sur la dernière échéance chiffrée.',
    /* Le cas où la récurrence existe déjà : envoyer « ajouter un revenu » ferait
       créer un doublon là où il ne manque qu'un chiffre. Le « de » s'élide
       comme au-dessus, et pour la même raison. */
    unpricedOne: 'Le revenu %s est à montant variable et pas encore chiffré.',
    unpricedMany: 'Les revenus %s sont à montant variable et pas encore chiffrés.',
    unpricedHint:
      'Confirme une échéance, ou indique un montant habituel sur la récurrence : la répartition se calcule dès qu’un chiffre existe.',
    /* Le chiffre existe, et il vaut zéro. Un prorata dont un terme est nul n'a
       pas plus de sens qu'un prorata sans terme : il donnerait 0 % des charges
       à quelqu'un, en silence. Le « de » s'élide comme au-dessus. */
    zeroOne: 'Le revenu %s est déclaré à zéro.',
    zeroMany: 'Les revenus %s sont déclarés à zéro.',
    zeroHint:
      'Corrige le montant de la récurrence, ou celui de son échéance : un revenu nul ne se répartit pas, il ne dit rien.',
    goToIncome: 'Ajouter un revenu',
    goToSubscriptions: 'Voir les récurrences',
    /* Le cas sans personne — une seule suffit désormais : sa part vaut 100 %,
       et l'écran montre le pot. */
    soloTitle: 'La répartition demande au moins une personne.',
    soloHint:
      'Ajoute les personnes avec qui tu partages. Une seule suffit : elle porte alors tout le commun.',
    goToSettings: 'Aller aux réglages',
    srShares: 'Parts de chacun : %s',
  },

  advances: {
    title: 'Avances',
    /* Le mot dit le geste : tu as avancé de l'argent, tu te le rembourses. La
       liste vit sous les récurrences parce que c'en est une — la mensualité
       qui remet l'épargne en place. */
    section: 'Avances',
    sectionHint:
      'Une charge payée en une fois depuis l’épargne, que tu te remets sur ton livret mois par mois.',
    add: 'Ajouter une avance',
    added: 'Avance ajoutée',
    deleted: 'Avance retirée',
    empty: 'Aucune avance en cours.',
    /* Le même vide, mais dans l'écran des avances, où il occupe la page : le DS
       §7 y veut une invitation et non un constat. La rangée de la liste des
       récurrences, elle, garde le constat — elle n'a qu'une ligne, et son
       chevron dit déjà où l'on va pour agir. */
    emptyInvite: 'Aucune avance en cours. Ajoute la première.',
    /* L'autre cause, et elle change le geste : une avance se rembourse **sur un
       support d'épargne**, que le formulaire exige (`savingSupportRequired`).
       Sans aucun support, « Ajoute la première » ouvrait un écran qu'on ne
       pouvait pas remplir — l'état vide renvoyait à une impasse. C'est la
       distinction que l'écran d'épargne fait déjà entre « personne » et « aucun
       support ». */
    emptyNoSupport:
      'Une avance se reprend mois par mois sur un support d’épargne, et il n’y en a aucun. Pose-en un d’abord.',
    /* Ce que la rangée des récurrences résume : combien, et combien il reste.
       Deux chiffres, parce que le second seul ne dit pas s'il vient d'une
       avance ou de six. */
    countOne: '%s avance',
    count: '%s avances',
    remainingTotal: '%s restant à remettre',
    /* Sous la rangée des avances, sur l'écran des crédits, et là seulement :
       c'est le seul endroit où elles voisinent avec de vraies charges, et où
       la confusion se paie. Une avance sort de l'épargne et y retourne — elle
       n'entre dans aucun total du mois, et aucun chiffre de cet écran ne la
       compte. */
    notACharge:
      'Une avance n’est pas une charge : elle attend d’être rendue, elle ne pèse pas sur le mois.',

    label: 'Ce que tu as payé',
    labelPlaceholder: 'Assurance auto',
    labelRequired: 'Donne un libellé à cette avance.',
    amount: 'Montant payé',
    amountHint: 'Le versement unique, en entier.',
    amountRequired: 'Indique ce que tu as payé.',
    paidOn: 'Payé le',
    category: 'Nature de la charge',
    categoryRequired: 'Dis de quelle charge il s’agit.',
    /* Le support est désigné par identifiant, et c'est le même objet que sur
       la page Épargne : celui qu'on a vidé, donc celui qu'on remplit. La
       reprise, les mensualités et le capital pointent tous vers lui. */
    savingSupport: 'Repris sur',
    savingSupportHint: 'Le livret ou le plan qui a payé, et qu’on reconstitue.',
    savingSupportRequired: 'Dis sur quel support tu as pris l’argent.',
    savingSupportNone: 'Ajoute un support d’épargne pour enregistrer une avance.',
    memberNone: 'Ajoute une personne pour enregistrer une avance.',
    from: 'Du mois de',
    to: 'Au mois de',
    periodInvalid: 'Le dernier mois ne peut pas précéder le premier.',

    monthly: 'Mensualité',
    monthlyOf: '%s par mois sur %s mois',
    restored: 'Déjà remis',
    remaining: 'Reste à remettre',
    settled: 'Entièrement reconstituée',
    over: 'Couvre %s → %s',
    remove: 'Retirer l’avance',
    removeConfirm:
      'Les mensualités déjà remises sur le livret sont conservées. Seule la mensualité à venir s’arrête. Retirer cette avance ?',

    /* Ce que l'écran doit dire une fois, sinon le chiffre paraît sorti de
       nulle part : la reprise est une entrée d'argent, la dépense qu'elle a
       financée reste à saisir comme n'importe quelle autre. */
    method: 'Comment c’est enregistré',
    methodDrawdown:
      'Le jour du paiement, l’app enregistre une reprise sur ton épargne : le livret baisse du montant avancé, et cet argent redevient disponible.',
    methodInstalments:
      'Chaque mois de la période, une mensualité repart sur le même support. Elle compte dans ton épargne, jamais dans tes charges — la charge, elle, a déjà eu lieu.',
    methodExpense:
      'La dépense que cette reprise a financée se saisit comme les autres, à sa date. L’app ne l’invente pas à ta place.',
    methodShared:
      'Cochée « à partager », la mensualité entre dans les charges communes : chacun en porte sa part au prorata, et celui qui a avancé se retrouve remboursé.',

  },

  savings: {
    title: 'Épargne',

    /* --- Le stock : ce que valent les supports ------------------------------
       Deux lectures qui ne se confondent jamais. Le **relevé** est un fait, à
       une date. La valeur **estimée** ajoute les mouvements depuis ce relevé, et
       elle est toujours nommée comme telle : sur un placement, la valeur bouge
       aussi avec le marché. */
    /* « Capital » et non « Épargne » : le mot dit ce qu'on regarde — ce qu'on
       possède —, là où « Épargne » nomme aussi bien le capital, le versement du
       mois et la capacité que le budget dégage. Quatre notions sous un seul mot
       ne s'apprennent pas ; c'est le vocabulaire qui les sépare, et non les
       paragraphes qu'on ajouterait pour les rattraper. */
    total: 'Capital d’épargne',
    totalHint: 'Somme des derniers relevés',
    /* L'épargne est individuelle, et le total le dit : un chiffre de cette
       taille sans propriétaire à côté se lit comme une somme du foyer — celle
       que cet écran existe précisément pour ne pas montrer. Le nom vit sous le
       chiffre et non dans l'étiquette : celle-ci porte la notion, qui ne change
       pas d'une personne à l'autre.
       Le gabarit reçoit déjà « d'Andrea » ou « de Marie » : l'élision dépend du
       prénom, donc de `format.de`, et un gabarit ne peut pas la décider. */
    totalHintOf: 'Somme des derniers relevés %s',
    totalNone: 'Aucun relevé pour l’instant.',
    /* Une inconnue n'est pas un zéro : le total ne peut pas se présenter comme
       exact tant qu'un support n'a jamais été relevé. */
    totalMissingOne: '1 support sans relevé',
    totalMissing: '%s supports sans relevé',
    /* Le flux, posé sous le stock et jamais dedans. « Mouvements du mois » et
       non « Ce mois-ci » : c'est déjà le nom de la section d'en dessous, et deux
       étiquettes identiques à un écran d'intervalle ne désignent pas la même
       chose ici. */
    netMonth: 'Mouvements du mois',

    /* « Mes supports », et plus « Où c'est placé » : la ventilation du mois
       s'appelait « Où ça se place », à trois blocs de distance. Deux étiquettes
       à un mot près pour le stock et pour le flux — c'est-à-dire pour les deux
       notions que cet écran existe pour séparer. */
    supports: 'Mes supports',
    analysis: 'Analyse',
    /* L'aperçu de `/epargne`, et il ne porte **aucun chiffre** — c'est un
       arbitrage d'octets assumé. La décomposition se calcule mois par mois sur
       cinq ans (`domain/savingSeries.ts`) ; en écrire ne serait-ce qu'un
       résultat ici ferait entrer tout ce module dans le graphe initial, que
       `scripts/size.mjs` plafonne, pour une ligne de teaser. La rangée dit donc
       ce qu'on va trouver, et l'écran dédié le calcule. */
    analysisPreview:
      'D’où vient ton capital : ton point de départ, tes versements, et ce que les comptes ont produit.',
    supportsEmpty:
      'Aucun support d’épargne. Ajoute un livret, un PEA ou tout autre support pour suivre sa valeur et tes versements.',
    supportsNoMember:
      'Ajoute une personne pour suivre ton épargne : un support est toujours à quelqu’un.',
    /* Le vide de la lecture, et non celui du document : quelqu'un d'autre a des
       comptes, celui qu'on regarde n'en a pas. Dire « aucun support d'épargne »
       serait faux, et le geste n'est pas le même — c'est la rangée de pilules,
       juste au-dessus, qui défait ce vide-là. */
    supportsNoneMine: 'Personne n’a de support à ce nom. Le foyer, lui, en a.',
    supportAdd: 'Ajouter un support',
    supportNew: 'Nouveau support d’épargne',
    supportEdit: 'Modifier le support',
    supportAdded: 'Support ajouté',
    supportUpdated: 'Support modifié',
    supportRemoved: 'Support supprimé',
    supportArchived: 'Support archivé',
    supportUnarchived: 'Support rouvert',

    /* Le formulaire. Le nom et le titulaire sont les deux seules réponses
       exigées : la valeur peut très bien n'être pas connue le jour où l'on
       crée le compte, et l'inventer serait pire que de l'ignorer. */
    supportLabel: 'Nom du support',
    supportLabelPlaceholder: 'Livret A',
    supportLabelRequired: 'Donne un nom à ce support.',
    /* « Titulaire » et non « À qui il est » : c'est le mot d'un compte, et il
       tient sur une ligne d'étiquette. */
    supportOwner: 'Titulaire',
    supportOwnerPlaceholder: 'Choisis une personne',
    supportOwnerRequired: 'Dis à qui est cette épargne : elle est toujours à quelqu’un.',
    supportKind: 'Type',
    /* Ce que l'aide disait — « sert à ranger et à colorer, jamais à calculer » —
       décrivait l'implémentation, pas le geste. Ce qui manque à qui remplit le
       champ, c'est de savoir à quoi il sert, pas ce qu'il ne fait pas. */
    supportKindHint: 'Sert à classer le support.',
    supportKindRequired: 'Choisis un type.',
    /* --- À quoi ce compte sert ---------------------------------------------
       Le seul classement que ni le type ni la cadence ne portent : le type dit
       la nature — « Livrets » —, la cadence dit à quel rythme on le relève, le
       rôle dit ce qu'on attend de l'argent qui est dessus. Deux Livrets A
       identiques n'ont pas le même rôle si l'un est le matelas et l'autre
       l'apport d'un appartement.
       Il change un chiffre, et un seul, ce que l'aide dit sans détour : ce
       qu'on tient sans revenus ne se compte que sur ce qui est mobilisable
       demain. Annoncer quatorze mois dont douze sont en unités de compte est la
       seule chose franchement fausse que l'app savait dire. */
    supportRole: 'À quoi il sert',
    supportRoleHint:
      'Seule l’épargne de précaution compte dans « combien de temps je tiens » : un plan d’actions ne se dénoue pas dans la semaine, et le compter promettrait une réserve qui n’existe pas.',
    /* Vide n'est pas « aucun rôle » mais « je n'ai pas répondu », et le libellé
       le dit : le compte ne pèse alors dans aucune autonomie, ce qui est la
       lecture prudente — jamais un rôle deviné. */
    supportRoleNone: 'Je ne l’ai pas encore décidé',
    /* Les trois rôles, nommés par la question à laquelle chacun répond, et non
       par un jargon de gestion de patrimoine. « Précaution » se comprend seul,
       « allocation d'actifs » non. */
    roleLabel: {
      buffer: 'Précaution',
      project: 'Projet',
      growth: 'Long terme',
    },
    /* Ce que chacun promet, en une ligne — lu sous la rangée des comptes, où
       le nom seul ne suffirait pas à décider. */
    roleHint: {
      buffer: 'Mobilisable demain, pour les coups durs',
      project: 'Une somme à réunir pour quelque chose',
      growth: 'Placé pour longtemps, qu’on ne compte pas toucher',
    },
    /* La cadence des relevés — le seul champ du formulaire qui parle du temps,
       et il ne projette rien : il dit quand l'app réclamera un relevé, et
       surtout quand elle se taira. Deux réponses, parce qu'il n'en existe que
       deux : une valeur qui ne bouge que de tes virements, ou une valeur que le
       marché refait. La question se tranche sans rien consulter. */
    supportPace: 'Rythme des relevés',
    supportPaceHint:
      'Un livret ne bouge que de tes versements : un relevé par an suffit, et l’app calcule le reste. Un PEA, un compte-titres ou une assurance-vie en unités de compte bougent tout seuls.',
    paceYearly: 'Une fois par an',
    paceQuarterly: 'Chaque trimestre',
    /* L'hypothèse de rendement — le seul champ du formulaire qui parle de
       l'avenir, et le seul qui n'engage que celui qui le remplit. Il est
       facultatif, et il le reste : l'app ne connaît aucun produit, ne lit aucun
       cours, et ne posera jamais de chiffre à la place de personne. Il ne
       change rien au capital ni à aucun total — il ne sert qu'aux projections
       (cahier §4.6 ter). */
    supportRate: 'Hypothèse de rendement',
    supportRateHint:
      'Facultatif, et seulement pour les projections : rien ici ne change ton capital ni tes totaux. Laissé vide, le simulateur applique l’hypothèse que tu poses sur son écran.',
    supportRateKind: 'Type de taux',
    supportRateGuaranteed: 'Taux garanti',
    supportRateAssumed: 'Rendement hypothétique',
    supportRateGuaranteedHint:
      'À n’utiliser que si ce taux est contractuellement garanti sur toute la durée que tu simuleras. Le taux connu d’un livret réglementé ne l’est pas : il est révisé.',
    rateInvalid: 'Entre 0 et %s %.',
    ratePerYear: '%/an',
    /* Le plafond de versements — sur ce qu'on **verse**, jamais sur le solde.
       Un Livret A est plafonné à 22 950 € versés, et son solde passe ensuite
       au-dessus par les intérêts : un plafond de solde arrêterait la courbe à
       plat là où la réalité continue de monter. */
    supportCap: 'Plafond de versements',
    supportCapHint:
      'Facultatif. Ce que le contrat autorise à verser en tout — 22 950 € sur un Livret A, par exemple. Les intérêts, eux, peuvent passer au-dessus. À toi de le poser : l’app ne connaît aucun produit.',
    capInvalid: 'Indique un plafond supérieur à zéro, ou laisse vide.',
    /* Le résumé d'une section repliée : ce qu'elle contient, jamais un compte
       de champs. « Plafond 22 950 € » se lit sans rien déplier. */
    capSummary: 'plafond %s',
    /* --- Les sections du formulaire ---------------------------------------
       Trois questions debout — nom, titulaire, type —, le reste replié. Voir
       `SupportFields` : des étapes auraient remplacé le défilement par des
       taps et fait passer cinq champs facultatifs pour des passages obligés. */
    sectionContract: 'Le contrat',
    sectionValue: 'Le premier relevé',
    sectionValueEmpty: 'Facultatif',
    /* --- Ce que le plafond dit à la saisie ---------------------------------
       Le plafond se saisissait et ne retenait rien : verser 50 € sur un livret
       plein passait sans un mot. Il arrête désormais la main — et il laisse
       trancher, parce que la place qu'il calcule est sous-estimée par
       construction (voir `domain/savingCap`). Ces mots portent donc les deux
       moitiés du geste : ce qui est dépassé, et les deux façons d'y aller. */
    capOver: 'Plafond dépassé de %s',
    capReached: 'Plafond de %s déjà atteint',
    capRoomBody: 'Il reste %s à verser sous le plafond de %s.',
    capNoRoomBody: 'Ce versement passerait %s au-dessus.',
    capApproximate:
      'La place se calcule sur ton dernier relevé, intérêts compris : elle est un peu sous-estimée. Si ta banque a accepté, verse quand même.',
    capClip: 'Verser %s',
    capAnyway: 'Verser quand même',
    capAccepted: 'Dépassement assumé : %s au-dessus du plafond.',
    /* La date de remplissage — une annonce, pas un refus : poser un versement
       mensuel qui finira par remplir un livret est le geste normal, et la seule
       chose qui manquait à l'écran était de dire quand. */
    capFillOne: 'Le plafond de %s est atteint dès la première échéance, le %s.',
    capFillMany: 'À ce rythme, le plafond de %s est atteint le %s, au %se versement.',
    capFillClipped: 'Ce dernier sera ramené à ce qui reste sous le plafond.',
    capFillNone: 'Plafond de %s déjà atteint : cette règle ne posera aucun versement.',
    /* Sur la fiche d'un support plein : les règles qui continuaient de le
       viser ne posent plus rien, et l'écran le dit plutôt que de laisser
       chercher pourquoi le prévisionnel s'est arrêté. */
    capRunningOne: 'Une règle verse encore ici : elle ne posera plus d’échéance.',
    capRunning: '%s règles versent encore ici : elles ne poseront plus d’échéance.',
    capStopRules: 'Arrêter ces règles',
    capRulesStopped: 'Règles arrêtées',
    supportNote: 'Note',
    supportNotePlaceholder: 'Épargne de sécurité, trois mois de charges',
    /* La gestion d'un support — archiver, rouvrir, supprimer. Elle vit en fin
       du formulaire de modification et non sur la fiche : ce sont des gestes
       rares, dont l'un est destructif, et une tuile posée en permanence sous
       l'historique leur donnait le poids d'une lecture quotidienne. */
    manage: 'Gestion du support',

    /* --- Les objectifs -----------------------------------------------------
       Le seul bloc de l'épargne qui **conclut**. Le reste dit ce qu'on a, où
       c'est placé et ce qu'on y verse — trois lectures qu'un relevé de banque
       donne aussi, en mieux. Ce qu'aucun relevé ne donne, c'est l'écart entre
       ce qu'on vise et ce qu'on tient : c'est le mot « en retard » ou « à
       l'heure » qui fait revenir sur l'écran, pas le capital.

       Le vocabulaire de l'état ne repose jamais sur la couleur (DS §2.3) : il
       tient dans un **mot**, doublé d'une jauge et d'une icône. La teinte n'est
       que le quatrième signal. */
    goals: 'Objectifs',
    goalsEmpty:
      'Aucun objectif. Pose un cap — un apport, un matelas de sécurité — et l’app te dira si tu y es.',
    goalAdd: 'Ajouter un objectif',
    /* La réserve qui accompagne les dates d'arrivée de la liste. Une date
       calculée au rythme d'aujourd'hui n'est pas une promesse : elle recule le
       mois où l'on verse moins, et elle avance quand on rattrape. La fiche dit
       pourquoi elle est prudente ; celle-ci dit qu'elle bouge. */
    goalsProjection:
      'Les dates sont une projection au rythme actuel, pas une promesse : elles bougent avec les mois que tu confirmes.',
    /* La porte du simulateur, depuis la fiche d'un objectif : ses comptes et son
       échéance, préréglés. Trois mots vivaient ici avec elle — « En faire un
       objectif », « Adopter ce rythme », « Rythme adopté » —, c'est-à-dire une
       sortie du simulateur vers le document. Elle a disparu avec la question à
       laquelle elle répondait : le simulateur ne cherche plus combien il faudrait
       verser, et c'est cette fiche-ci qui le dit (`domain/goal.ts`). Ce qui reste
       est une lecture à sens unique — l'épargne alimente la simulation, jamais
       l'inverse. */
    goalSimulate: 'Simuler autrement',
    /* Le formulaire. Trois questions, et c'est tout ce qu'un objectif stocke :
       le capital, le rendement et le versement se lisent sur les comptes. */
    /* La gestion, en fin de formulaire comme pour un support : ranger, reprendre,
       supprimer. Des gestes rares, dont l'un est destructif. */

    /* --- Le verdict --------------------------------------------------------
       Quatre états, et chacun se dit par un mot avant d'être une couleur.
       « À l'heure » et « en retard » sont des conclusions ; « 68 % » n'en est
       pas une, et c'est pourquoi la jauge ne suffit pas. */
    goalOn: 'à l’heure',
    goalAhead: '%s mois d’avance',
    goalAheadOne: '1 mois d’avance',
    goalLate: '%s mois de retard',
    goalLateOne: '1 mois de retard',
    goalReached: 'atteint',
    /* Ce que l'app ne peut pas dire, et pourquoi : à versement nul et sans
       rendement, il n'existe pas de date d'arrivée — en inventer une serait
       pire que se taire. */
    goalNoReach: 'pas à ce rythme',
    goalNoCapital: 'aucun relevé sur ces comptes',
    /* La date d'arrivée, sous l'état : « 42 000 € en mars 2028 ». */
    goalReachOn: '%s en %s',
    /* Le rattrapage : la seule chose actionnable de tout l'écran. Un écart sans
       ce chiffre-là se contemple, avec lui il se décide. */
    /* La fiche. « 28 400 € sur 42 000 € » : les deux montants ensemble, parce
       qu'un pourcentage seul ne dit pas de quoi il est le pourcentage. */
    goalProgress: '%s sur %s',
    /* Pourquoi la date annoncée est prudente. Elle vit sur la fiche et pas
       ailleurs : c'est là qu'on lit la date, donc là que la réserve sert. */
    /* Le tracé : le prévu, et les relevés réels posés dessus. C'est ce qui fait
       la différence entre une courbe décorative et un suivi. */

    /* --- Les relevés -------------------------------------------------------
       Un **relevé** est une observation datée de ce que vaut le support ; un
       **mouvement** est de l'argent qui passe. Tout le vocabulaire de ce bloc
       tient à cette distinction, et c'est elle qui rend l'écran lisible sans
       une phrase d'explication : « Ajouter un relevé » dit qu'on empile une
       observation de plus, quand « Mettre à jour la valeur » laissait croire
       qu'on écrasait la précédente. */
    value: 'Valeur relevée',
    /* Le placeholder d'un champ de relevé ne peut pas être « 0,00 » : posé sous
       « Dernier relevé : 10 631,00 € », il se lit comme une valeur déjà
       enregistrée — et un champ qu'on laisse tel quel n'écrirait alors pas
       « rien » mais « ce livret est vide ». Il dit donc ce qu'on attend. */
    valueNew: 'Nouvelle valeur',
    valueInitial: 'Premier relevé',
    valueHint: 'Facultatif : laisse vide si tu ne le connais pas.',
    valueDate: 'Date du relevé',
    valueKnown: 'Dernier relevé',
    /* Sur la fiche et dans la liste : deux formulations pour deux contextes.
       La première ouvre une tuile, la seconde tient sur une ligne de liste. */
    valueNone: 'Aucun relevé pour l’instant.',
    valueNever: 'aucun relevé',
    valueOn: 'relevé le %s',
    /* La fraîcheur, en trois paliers et sans une couleur (voir `valuationAge`).
       Une date seule ne dit pas son âge : personne ne compte les mois de tête
       devant un « 8 février » posé sous un chiffre. Et un relevé ancien n'est
       pas une erreur — il attend une confirmation, d'où « à actualiser » et non
       une alerte.
       Le dernier palier arrive à la cadence du support, et non au sixième mois
       pour tout le monde : un Livret A relevé en février se disait « à
       actualiser » en août quand l'app connaissait son capital à l'euro près. */
    valueAgeOne: 'relevé il y a 1 mois',
    valueAge: 'relevé il y a %s mois',
    valueStale: 'à actualiser · relevé il y a %s mois',
    valueUpdate: 'Ajouter un relevé',
    valueFirst: 'Ajouter un premier relevé',
    valueEdit: 'Corriger le relevé',
    valueAdded: 'Relevé enregistré',
    valueUpdated: 'Relevé corrigé',
    valueRemoved: 'Relevé supprimé',
    valueRequired: 'Indique la valeur relevée.',
    valueRemove: 'Supprimer ce relevé',
    valueRemoveConfirm:
      'Ce relevé disparaît de l’historique. Les mouvements du support ne bougent pas. Supprimer ?',
    /* Un relevé n'est pas une opération, et l'écran doit le dire une fois :
       sinon « 18 320 € le 8 août » se lit comme un virement de 18 320 €. La
       phrase vit là où la confusion est possible — la légende du calcul et les
       deux formulaires de relevé —, et nulle part ailleurs : sur le formulaire
       d'un support, où l'on saisit un nom et un titulaire, elle ne répondait à
       aucune question qu'on se pose. */
    valueMethod:
      'Un relevé de valeur n’est pas un mouvement d’argent : il ne compte ni dans le solde du mois, ni dans les versements, ni dans la capacité d’épargne.',
    history: 'Historique des relevés',
    historyEmpty: 'Aucun relevé. Ajoute le premier pour suivre l’évolution de sa valeur.',
    historyOne: 'La courbe apparaîtra à partir du deuxième relevé.',
    /* Une liste qui se coupe doit dire comment voir la suite. « et 12 de plus »
       annonçait douze lignes sans donner le moyen de les atteindre : un compte
       sans geste est une impasse. */
    historyMore: 'Voir les %s autres relevés',

    /* --- Les paliers de taux -----------------------------------------------
       Un **palier** dit ce que le support sert à partir d'une date. Le mot
       compte : « changer le taux » laisserait croire à un réglage qu'on
       écraserait, quand le geste ajoute une ligne et laisse la précédente
       courir jusqu'à sa veille. C'est ce qui empêche l'évolution déjà tracée
       d'être recalculée à un taux qui n'y a jamais couru. */
    /* Le taux converti depuis un document d'avant la v12 : il n'avait pas de
       date parce qu'il valait pour toute l'histoire du compte. « Depuis le
       1er janvier 1970 » ne voudrait rien dire à personne. */

    /* --- L'évolution, support par support ----------------------------------
       La seule lecture de l'écran qui capitalise, et elle le dit. Entre deux
       relevés, personne ne sait ce que valait le PEA : ce qui est tracé se
       dérive des mouvements confirmés et du taux en vigueur ce mois-là. Les
       mois relevés portent un point — ce sont les faits. */

    /* --- Relever plusieurs supports d'un coup ------------------------------*/
    /* On ne relève pas ses comptes un par un : les chiffres arrivent ensemble,
       sur un relevé de fin de mois. D'où un écran qui les prend tous, et un
       vocabulaire au pluriel pour ne pas le confondre avec la fiche d'un
       support — où l'on ne parle que de lui. */
    valuesUpdate: 'Mettre à jour les relevés',
    /* Ce que l'écran dit quand il a quelque chose à demander — et il ne le dit
       que là. Un raccourci posé en permanence laissait entendre un rituel
       mensuel, qui n'est la bonne cadence d'aucun support : réclamer une donnée
       qui ne produit rien ne produit que de la culpabilité. Le reste du temps le
       geste reste atteignable, en `ghost` : c'est le poids du bouton qui dit la
       fréquence, comme pour « Ajouter un support » juste en dessous. */
    valuesDueOne: '1 relevé à faire',
    valuesDue: '%s relevés à faire',
    valuesHint:
      'Saisis seulement les valeurs que tu as vérifiées. Un champ laissé vide ne change rien.',
    valuesDateHint: 'Elle vaut pour tous les relevés saisis ci-dessous.',
    valuesAdded: '%s relevés enregistrés',
    valuesLast: 'Dernier relevé : %s · %s',
    /* Le chiffre que la banque va confirmer ou corriger : c'est lui qu'on
       compare au relevé, pas la dernière valeur connue. */
    valuesDrift: 'estimé à %s',

    /* --- La valeur estimée -------------------------------------------------*/
    estimated: 'Valeur estimée',
    /* Jamais « valeur actuelle » tout court : ce calcul ignore les variations
       de marché, et le présenter comme un fait serait une fausse précision. */
    estimatedWarning:
      'Estimation : elle ne tient pas compte de ce que le marché a pu faire depuis. Ajoute un relevé pour la remplacer par un chiffre observé.',
    movedSince: 'Mouvements depuis',
    /* Le même chiffre, mais au pluriel des supports : sur un total, « depuis »
       ne désigne pas un relevé mais autant qu'il y a de comptes. */
    movedSinceTotal: 'Versé depuis les derniers relevés',

    /* --- Combien de temps le capital tient ---------------------------------
       Le seul chiffre de cet écran qu'une banque ne calculera jamais : elle
       voit le solde, elle ne sait pas ce qu'est une charge chez quelqu'un.
       « 10 450 € » est une anecdote — l'appli de la banque le dit mieux, plus
       vite et sans rien demander ; « tu tiens 4,2 mois » est une décision, et
       c'est ce qui rend un relevé utile. */
    coverage: 'Combien de temps je tiens',
    /* Le nombre porte son unité et rien d'autre : la condition se lit sous lui,
       où elle ne coupe pas le chiffre en deux. */
    coverageValue: '%s mois',
    /* La condition dit désormais les **deux** bouts du quotient : sur quoi il
       est calculé autant que ce qu'il suppose. Il ne disait que le second, et
       laissait croire que tout le capital tenait la promesse — PEA compris. */
    coverageHint: 'sans revenus, sur ton épargne de précaution',
    /* Un quotient sans dénominateur ne vaut pas zéro : il ne veut rien dire.
       L'écran dit alors ce qui manque, plutôt qu'un chiffre qu'il faudrait
       corriger de tête. */
    coverageNoMonth: 'Il faudra un mois entier pour le dire : celui-ci n’est pas fini.',
    coverageNoCharge: 'Aucune charge sur la période : il n’y a rien à diviser.',
    /* Le numérateur peut manquer lui aussi, et pour une raison qui se répare :
       personne n'a encore dit lequel de ces comptes est le matelas. On demande
       plutôt que de deviner — deviner rendrait le chiffre faux dans le sens qui
       flatte, ce que ce champ existe précisément pour empêcher. */
    coverageNoBuffer:
      'Dis lequel de tes comptes est ton épargne de précaution : c’est le seul argent qui tient quand les revenus s’arrêtent.',
    coverageSetRoles: 'Ranger mes comptes',
    /* La vérification, repliée comme celle de la capacité : c'est ce qu'on
       ouvre une fois pour comprendre d'où sort le chiffre, pas ce qu'on relit
       chaque mois.
       Un autre libellé que « Comprendre le calcul », qui vit une tuile plus
       bas : deux sommaires du même nom sur le même écran ouvrent sur deux
       contenus différents, et rien ne dit lequel on déplie. Celui-ci nomme
       d'ailleurs ce qu'on vient y chercher — quelles sorties entrent dans le
       dénominateur, question à laquelle aucun autre écran ne répond. */
    coverageMethod: 'Ce que ce chiffre compte',
    coverageCapital: 'Capital de précaution',
    coverageMonthly: 'Charges d’un mois moyen',
    coverageOverOne: 'moyenne sur 1 mois',
    coverageOver: 'moyenne sur %s mois',
    /* Les trois décisions qui font la justesse du chiffre, et qu'aucun autre
       écran ne dit. */
    coverageMethodDenominator:
      'Les charges et les mensualités de crédit comptent : elles ne s’arrêtent pas quand le revenu s’arrête. Les versements d’épargne, non — c’est la première chose qu’on coupe.',
    coverageMethodMonths:
      'Le mois en cours ne compte pas : il n’a pas encore tout dépensé, et il ferait paraître les charges plus légères qu’elles ne sont.',
    coverageMethodUnvalued:
      'Un support sans relevé n’entre pas dans le capital : l’app ne sait pas ce qu’il vaut, et le compter à zéro serait aussi faux que l’inventer.',
    /* La quatrième décision, et la seule qui soit nouvelle : le numérateur ne
       compte que ce qui est mobilisable. C'est le pendant exact de la phrase
       sur le dénominateur — l'une écarte des sorties, l'autre écarte du
       capital, et les deux le disent en toutes lettres. */
    coverageMethodBuffer:
      'Seuls les comptes marqués « précaution » comptent : un plan d’actions se dénoue en plusieurs jours, est fiscalisé avant cinq ans, et ne vaut pas aujourd’hui ce qu’il vaudra le jour où il faudrait le vendre.',
    coverageMethodUnroledOne:
      'Un compte n’a pas encore de rôle : il ne compte pas ici tant que personne n’a dit à quoi il sert.',
    coverageMethodUnroled:
      '%s comptes n’ont pas encore de rôle : ils ne comptent pas ici tant que personne n’a dit à quoi ils servent.',

    /* --- La fiche d'un support --------------------------------------------*/
    monthFlows: 'Ce mois-ci',
    contributions: 'Versements',
    withdrawals: 'Reprises',
    net: 'Net',
    movements: 'Mouvements',
    movementsEmpty: 'Aucun mouvement sur ce support.',
    movementsMore: 'Voir les %s autres mouvements',
    archived: 'Archivé',
    archivedHint:
      'Un support archivé ne s’affiche plus dans les formulaires. Ses relevés et ses mouvements restent.',
    archive: 'Archiver le support',
    archiveConfirm:
      'Il disparaît des formulaires de saisie. Ses relevés, ses mouvements et ses récurrences confirmées restent. Archiver ?',
    /* Le cas incohérent qu'on refuse de créer : un compte invisible qui
       continue de recevoir un virement chaque mois. */
    archiveRunningOne: 'Ce support reçoit encore une récurrence active.',
    archiveRunning: 'Ce support reçoit encore %s récurrences actives.',
    archiveAndStop: 'Arrêter la récurrence et archiver',
    archiveAndStopMany: 'Arrêter les récurrences et archiver',
    unarchive: 'Rouvrir le support',
    remove: 'Supprimer le support',
    removeConfirm:
      'Ce support n’a ni relevé, ni mouvement, ni récurrence : il disparaît sans rien emporter. Supprimer ?',
    /* Pourquoi le bouton dit « Archiver » et pas « Supprimer » : la règle se
       lit, elle ne se devine pas. */
    removeBlocked:
      'Ce support a une histoire — des relevés, des mouvements ou une récurrence. Il s’archive plutôt qu’il ne s’efface.',

    /* --- Le rattachement des mouvements ------------------------------------*/
    support: 'Support',
    supportRequired: 'Dis sur quel support ce mouvement passe.',
    supportNone: 'Aucun support d’épargne.',
    supportCreateFirst: 'Créer un support',
    unlinked: 'Non rattaché',
    unlinkedHint:
      'Ces mouvements d’épargne ne désignent aucun support : ils comptent dans le mois, mais ne disent pas où l’argent est allé. Ouvre-les pour les rattacher.',
    srHistory: 'Évolution de la valeur, de %s le %s à %s le %s.',

    /* La cascade, terme par terme. Le résultat seul se croit sur parole ; les
       trois lignes qui le produisent se vérifient, et disent surtout *quoi
       changer* — un crédit qui mange la moitié de la capacité se voit ici, et
       nulle part ailleurs. Elle a quitté la tuile pour la légende repliée :
       c'est une vérification, pas une lecture qu'on vient chercher, et posée en
       permanence elle mettait trois chiffres de plus entre la capacité et le
       geste qu'elle appelle. */
    flowIncome: 'Revenus',
    flowCharges: 'Charges',
    flowDebts: 'Crédits',
    /* Les mêmes termes, quand le prorata se calcule : la cascade disait
       « Charges » d'un bloc là où le montant mêlait ses lignes à elle et sa
       part du pot commun, et c'est justement ce qu'on vient vérifier ici — un
       loyer partagé pèse autant qu'un crédit, et ne se voyait nulle part. La
       part du commun se retranche des deux natures à la fois, elle vient donc
       après elles et non entre les deux. La somme des termes vaut toujours la
       capacité au centime : ce sont les mêmes totaux, seulement séparés. */
    flowOwnCharges: 'Charges perso',
    flowOwnDebts: 'Crédits perso',
    flowCommon: 'Part du commun',
    capacity: 'Capacité d’épargne',
    capacityHint: 'échéances prévues comprises',
    capacityNegative: 'Les charges dépassent les revenus : il n’y a rien à placer ce mois-ci.',

    /* « Répartition des versements » et non « Où ça se place » : voir
       `supports`. Les deux étiquettes se répondaient à un mot près pour dire
       l'une le capital, l'autre le mois. */
    placed: 'Répartition des versements',
    placedTotal: 'Versé ce mois',
    placedEmpty: 'Aucun versement enregistré ce mois-ci.',
    /* Un versement que personne ne porte n'est à personne, et l'épargne ne se
       partage pas : il ne compte donc dans la capacité de personne. C'est le
       pendant exact du salaire resté « en commun » sur la répartition. */
    placedUnassigned:
      'Un versement laissé « en commun » n’entre dans l’épargne de personne. Attribue-le pour qu’il compte.',

    /* Ni « reste à placer » ni « reste à vivre » : les deux se ressemblent
       trop pour vivre sous des noms voisins, alors qu'ils ne mesurent pas la
       même chose — l'un est la part de la capacité d'épargne pas encore
       versée, l'autre le solde de trésorerie avant la prochaine rentrée
       d'argent. « Encore disponible » ne prête à aucune des deux confusions. */
    left: 'Encore disponible',
    /* Le nom de l'écran qui porte le flux du mois, et de la tuile qui y mène.
       « Ce mois » et non « Capacité d'épargne » : la tuile du tableau de bord
       porte déjà ce second mot, et deux étiquettes identiques à deux écrans
       d'écart ne désignent pas la même chose — l'une est un chiffre, l'autre
       est une destination. */
    month: 'Ce mois',
    /* « capacité − versements » ne se dit plus : les deux rangées au-dessus
       *sont* la soustraction, et l'écrire à côté la commente au lieu de
       l'expliquer. */
    leftNone: 'Toute la capacité est placée.',
    /* Verser plus qu'on ne dégage n'est pas une erreur de saisie : c'est une
       lecture, et celle qu'on vient chercher. */
    over: 'Dépassement',
    overHint: 'les versements dépassent la capacité de %s',
    rate: '%s des ressources mises de côté',
    rateNone: 'aucune ressource ce mois-ci',
    /* Le mois où une avance est posée : le livret a payé une charge de l'année,
       et il a donc rendu plus qu'il n'a reçu. Sans cette phrase, le chiffre
       négatif au-dessus se lit comme une erreur. */
    withdrawn: 'Plus repris que placé ce mois-ci — une avance est passée par là.',

    /* Une légende, et non une tuile de plus. Elle porte la même chose qu'avant —
       la cascade, puis quatre paragraphes — mais repliée : c'est une pédagogie
       qu'on ouvre une fois, pas une lecture qu'on refait chaque mois, et posée
       à plat elle occupait le dernier tiers de l'écran. */
    method: 'Comprendre le calcul',
    methodFormula: 'Capacité = revenus − charges − crédits.',
    methodExcluded:
      'Un versement n’est pas une charge : il sort du compte, mais il reste à qui le fait. Il ne pèse donc ni dans les charges du mois, ni dans le partage.',
    methodShared:
      'La part des charges communes que la personne porte est comptée dans la capacité — au prorata des revenus, comme partout ailleurs. La cascade la pose sur sa propre ligne, crédits communs compris : ce qui reste au-dessus est à elle seule.',
    methodBalance:
      'Le solde du mois, lui, compte le versement comme une sortie : c’est exact en trésorerie, et c’est pour ça que les deux chiffres diffèrent.',
  },

  credits: {
    title: 'Crédits et dettes',
    add: 'Ajouter un crédit',
    edit: 'Modifier le crédit',
    /* Le nom du lien posé au coin de chaque ligne. La ligne n'est plus un
       bouton — elle empile un anneau et quatre chiffres —, et ce nom-ci se lit
       hors de la liste : « Ouvrir › » n'y dirait pas lequel. */
    open: 'Ouvrir le crédit %s',
    added: 'Crédit ajouté',
    updated: 'Crédit modifié',
    removed: 'Crédit retiré du suivi',
    remove: 'Retirer du suivi',
    removeConfirm:
      'Les mensualités déjà versées sont conservées, ainsi que la récurrence qui les pose. Seul le suivi du capital s’arrête. Retirer ce crédit ?',
    empty: 'Aucun crédit suivi. Ajoute le premier pour voir ce qu’il te reste à devoir.',
    remaining: 'Capital restant dû',
    principal: 'Capital emprunté',
    paid: 'Déjà versé',
    monthly: 'Mensualité',
    rate: 'Taux annuel',
    ratePlaceholder: '4,5',
    rateHint: 'Laisse vide pour un prêt sans intérêt : le capital décroît alors du montant versé, exactement.',
    startedOn: 'Première mensualité',
    endsOn: 'Dernière mensualité',
    monthsLeft: '%s mensualité%s restante%s',
    settled: 'Soldé',
    linked: 'Récurrence qui le rembourse',
    linkedNone: 'Aucun — le capital ne bougera pas',
    linkedHint:
      'C’est la récurrence qui pose les mensualités et fait décroître le capital. Sans elle, seul le montant emprunté est connu.',
    total: 'Reste à devoir',
    progress: '%s remboursé',
    labelPlaceholder: 'Prêt voiture',
    principalRequired: 'Indique le capital emprunté.',
    labelRequired: 'Donne un libellé à ce crédit.',
    categoryRequired: 'Choisis une catégorie.',
  },

  onboarding: {
    /* La file du premier lancement, et sa grammaire est celle de la revue :
       une barre de segments, une question par carte, un pied à trois boutons.
       Sa longueur dépend des réponses — un prénom de plus est une carte de
       revenu de plus —, d'où un compteur et non « étape 3 sur 4 » : le total
       bouge sous le doigt et une phrase figée mentirait d'un cran. */
    counter: '%s / %s',
    /* Le compteur en toutes lettres, pour qui n'a que la voix : les segments
       sont décoratifs et le chiffre seul se lirait « trois barre sept ». */
    progress: 'Question %s sur %s',
    /* « Revenir » et non « Retour » : le second nomme la sortie de l'écran,
       celui-ci recule d'une carte sans rien perdre. Même mot qu'à l'écriture
       d'une règle, qui est la même file. */
    back: 'Revenir',
    /* Passer une carte, et le dire sans s'excuser : aucune réponse de cette
       file n'est exigée, et le cahier §4.1 met la visibilité de ce bouton comme
       condition à l'existence de chaque question. */
    later: 'Plus tard',
    start: 'Commencer',
    /* En PWA installée il n'y a pas de bouton retour du navigateur : la
       première carte porte le sien, sans quoi on n'a plus qu'à répondre ou à
       fermer. */
    backToLanding: 'Revenir à la présentation',

    /* --- 1. Le foyer ---------------------------------------------------- */

    /* « Qui vit ici ? » suppose la cohabitation, que le calcul n'utilise
       jamais : le prorata marche aussi bien pour deux personnes à deux
       adresses. Le titre garde la question du design, le corps la corrige. */
    whoTitle: 'Qui vit ici ?',
    whoBody:
      'Seul, l’app n’a personne à nommer et tout t’est attribué. À plusieurs, elle partage les charges communes entre vous — et ça marche aussi à deux adresses.',
    whoLabel: 'Composition du foyer',
    whoSolo: 'Je vis seul',
    whoMulti: 'À plusieurs',
    /* La liste comprend **qui répond**, et l'écran le dit plutôt que de créer un
       membre « moi » dans son dos. Ce n'est pas une préférence d'écriture : le
       prorata pèse les revenus des *membres* (`domain/split.ts`), donc un revenu
       posé sans propriétaire ne compte pas au dénominateur — un foyer de deux
       dont l'un ne serait pas membre verrait l'autre porter 100 % des charges
       communes. Solo, la question ne se pose pas : il n'y a personne à
       comparer, et se désigner soi-même serait la seule réponse de l'app à
       n'avoir aucune conséquence. */
    namesLabel: 'Prénom',
    namesHint: 'Le tien compris : c’est de vos revenus que le partage se déduit.',
    namesPlaceholder: 'Alix',
    namesAdd: 'Ajouter',
    namesRemove: 'Retirer %s',
    namesEmpty: 'Personne pour l’instant. Ajoute un prénom, en commençant par le tien.',
    /* Ce que la réponse change, dit avec les prénoms qu'on vient de taper.
       C'est aussi la seule fois où la règle de partage s'énonce : elle n'a pas
       de carte à elle, parce qu'elle n'offre aucun choix — le modèle ne sait
       faire que le prorata (`memberShares`), et une carte qui ne demanderait
       rien serait la seule de la file à ne pas être une question. */
    namesShareOne: '%s : tout lui est attribué, il n’y a rien à partager.',
    namesShare:
      '%s : les charges communes se partageront entre vous, au prorata de vos revenus — ce qui laisse à chacun le même reste à vivre.',

    /* --- 2. Les revenus ------------------------------------------------- */

    incomeSoloTitle: 'Ce que tu gagnes chaque mois',
    incomeOfTitle: 'Ce que gagne %s',
    incomeBody:
      'Salaire, pension, allocations : ce qui rentre tous les mois. Une approximation suffit, ça se corrige.',
    /* Le nom accessible du pavé : ce qu'on est en train de saisir, et pas
       « montant » tout court — la file en demande trois d'affilée. */
    incomeKeypad: 'Revenu mensuel',

    /* --- 3. Le toit ----------------------------------------------------- */

    /* « Loyer » seul disait « cette app n'est pas pour toi » à qui n'en paie
       pas — chez ses parents, hébergé, logé par l'employeur. Le titre nomme donc
       les trois façons de payer pour se loger, et le corps dit qu'on peut
       passer. */
    rentTitle: 'Ce que tu verses pour te loger',
    rentBody:
      'Loyer, crédit immobilier, participation. Passe si tu ne paies rien pour ça — c’est un cas comme un autre.',
    rentKeypad: 'Montant du loyer',

    /* --- 4. Les autres charges ------------------------------------------ */

    extrasTitle: 'Qu’est-ce qui revient encore ?',
    extrasBody:
      'Abonnements, mutuelle, cantine, forfait. Chaque ligne devient une règle : elle remplira les mois suivants toute seule.',
    extrasName: 'Ce que c’est',
    extrasNamePlaceholder: 'Netflix, cantine, mutuelle…',
    extrasAmount: 'Combien',
    extrasAdd: 'Ajouter',
    extrasRemove: 'Retirer %s',
    extrasList: 'Ce qui revient chaque mois',
    extrasTotal: 'Total mensuel',
    /* La catégorie de repli, annoncée. `Recurrence.categoryId` est obligatoire
       et une ligne libre n'en désigne aucune de façon fiable : deviner « Netflix
       → Streaming » rangerait un jour « cantine » sous « Loisirs » sans le
       dire. Le repli est donc assumé à voix haute, avec le geste qui le
       corrige. */
    extrasFallback: 'Rangé sous %s · tu pourras le préciser depuis Récurrences.',
    extrasEmpty: 'Rien pour l’instant. Ajoute ce qui te vient, le reste s’ajoute plus tard.',
    /* Le refus de la ligne, dit plutôt que gris. « Ajouter » était désactivé
       tant que les deux champs n'étaient pas bons, sans jamais dire lequel
       manquait — un montant tapé « 12,,5 » laissait un bouton mort et aucune
       cause. Le nom d'abord : c'est le champ de gauche, et celui qu'on saute. */
    extrasNameRequired: 'Donne un nom à cette charge.',

    /* --- 5. Le point de départ ------------------------------------------ */

    startMonthTitle: 'Point de départ',
    /* Le mois **affiché**, et rien d'autre. Le mois courant s'ouvre de toute
       façon — `hydrate` le rouvre à chaque lancement, et l'app en fait un
       invariant : jamais une tâche pour l'utilisateur. Ce que ce choix décide,
       c'est le 1er de quel mois porte les règles, donc le mois où elles se
       mettent à courir. */
    startMonthBody:
      'À partir de quand ces règles courent. Le mois courant reste consultable dans les deux cas — il sera simplement vide si tu commences au suivant.',
    startMonthLabel: 'Premier mois suivi',
    startCurrent: 'Ce mois-ci',
    startNext: 'Le mois prochain',
    startCurrentHint: 'Les échéances de %s arrivent tout de suite, à confirmer.',
    startNextHint: '%s s’ouvrira déjà rempli. %s restera vide.',

    /* --- 6. Le récapitulatif -------------------------------------------- */

    summaryTitle: 'Voilà ton mois',
    summaryBody: 'Relis. Tout se reprend ensuite, ligne par ligne.',
    summaryHousehold: 'Foyer',
    summaryHouseholdSolo: 'Toi',
    summaryShare: 'Partage',
    summaryShareValue: 'au prorata des revenus',
    summaryIncome: 'Revenus prévus',
    summaryRent: 'Logement',
    summaryExtras: '%s autres charges',
    summaryExtrasOne: '1 autre charge',
    /* « Prévisionnel » et non « reste à vivre ». Les deux mots désignent deux
       chiffres différents dans le domaine : le prévisionnel est revenus moins
       charges, le reste à vivre (`domain/stats.ts`) est le solde arrêté la
       veille de la prochaine rentrée d'argent. Sur un foyer payé le 28, l'écart
       vaut presque un mois de charges — les confondre ici ferait mentir la
       première lecture de l'app sur elle-même. */
    summaryForecast: 'Prévisionnel',

    /* Le jour ne se demande nulle part : un champ de plus par carte aurait fait
       de la file le questionnaire que le cahier §4.1 refuse. Il se pose donc au
       1er — mais il se *dit*, parce qu'une valeur choisie à la place de
       quelqu'un et jamais annoncée se découvre au premier mois faux. */
    dayNote: 'Posées au 1er de chaque mois. Le jour, le nom et la catégorie s’ajustent ensuite depuis Récurrences.',

    privacy: 'Tes données restent sur cet appareil. Rien n’est envoyé nulle part.',
    /* La contrepartie, elle, se dit avant d'arriver ici : elle ferme la
       présentation, sous les trois portes. Ce qui reste ici est ce qu'elle ne
       peut pas dire — le geste, et où le faire. */
    backup:
      'Le geste qui la couvre tient en une minute : exporte un fichier de temps en temps, depuis les réglages.',
    /* La même phrase, quand ce navigateur a déjà répondu qu'il ne s'engageait
       pas. Elle ne remplace l'ordinaire que dans ce cas-là — pas sur un simple
       « on ne sait pas », pas avant d'avoir posé la question : annoncer une
       conservation fragile à tout le monde ferait de la phrase honnête un
       avertissement de plus qu'on n'écoute pas. */
    backupFragile:
      'Et ce navigateur ne garantit pas de les conserver. Avant de saisir beaucoup de choses, prends l’habitude d’exporter un fichier : c’est la seule copie qui ne dépend pas de lui.',
  },

  about: {
    what: 'Ce que c’est',
    whatBody:
      'Tout compte fait suit tes finances : ce qui rentre, ce qui sort, ce qu’il reste, et qui paie quoi.',
    whatNotBank:
      'Ce n’est pas une banque. Aucun compte n’y est relié, aucun relevé n’y est lu : tu écris ce que tu sais, l’app tient les comptes.',
    whatOffline:
      'Une fois ouverte, elle fonctionne sans réseau et s’installe sur l’écran d’accueil comme une app.',

    how: 'Comment ça marche',
    howRecurring:
      'Ce qui revient chaque mois s’écrit une fois. Loyer, abonnement, salaire : l’app pose leurs échéances dans les mois à venir.',
    howForecast:
      'Le mois arrive déjà écrit, en prévision. Tu confirmes chaque échéance quand elle tombe, et le solde suit.',
    howSplit:
      'Les charges communes se partagent au prorata des revenus. Ce qu’une seule personne a avancé se rend le mois suivant.',
    howKinds:
      'Rien n’est rangé en comptes bancaires : tout est une entrée ou une sortie, sous l’une des quatre natures — ressources, charges, crédits, versements.',

    data: 'Tes données',
    dataBody:
      'Tout est enregistré dans ce navigateur, et nulle part ailleurs : ni compte, ni serveur, ni mesure d’audience.',
    /* La promesse et sa contrepartie dans la même tuile : « rien ne sort d'ici »
       et « rien ne revient si tu vides le navigateur » sont la même phrase, et
       n'en garder qu'une moitié se paierait un jour. */
    dataLimit:
      'C’est aussi la contrepartie : vider les données du navigateur les efface, et personne ne peut te les rendre. Exporte de temps en temps — l’app te le rappelle au bout de trente jours.',

    project: 'Le projet',
    projectBody:
      'Le code est ouvert, sous licence AGPL-3.0 : tu peux le lire, le copier, le faire tourner chez toi. À une condition — ce que tu en publies reste ouvert à ton tour, même si tu te contentes de le mettre en ligne.',
    repo: 'Le code sur GitHub',
    license: 'La licence AGPL-3.0',
    version: 'Version %s',
    /* Annoncé aux lecteurs d'écran, jamais à l'œil : le soulignement dit déjà
       que c'est un lien, rien ne dit qu'il quitte l'app — et en mode installé,
       il n'y a pas de bouton retour pour revenir d'un site ouvert par erreur. */
    newWindow: '(s’ouvre dans une nouvelle fenêtre)',

    seeLanding: 'Revoir la présentation',
    /* La version affichée ne disait pas ce qu'elle apporte, et `UpdatePrompt`
       demandait d'accepter une mise à jour sans la nommer. Sur une app qui
       refuse par principe de se remplacer dans le dos de qui l'utilise, c'est
       la moitié manquante du geste. */
    changelog: 'Ce qui a changé',
    /* Le cahier des charges et le design system sont la source de vérité du
       projet, et son meilleur argument de sérieux : ils n'étaient liés de nulle
       part côté produit. */
    docs: 'La documentation du projet',
  },

  /* Les trois pages juridiques. Seulement leurs noms et le châssis commun : la
     prose vit dans `i18n/legal.ts`, qui se charge avec les écrans qui la
     rendent. Ces libellés-ci, eux, sont écrits par le pied de page sur tous les
     écrans — ils ne peuvent pas attendre un morceau chargé à la demande. */
  legal: {
    notice: 'Mentions légales',
    privacy: 'Confidentialité',
    terms: 'Conditions d’utilisation',
    /* Le pied de page n'a pas la place de trois libellés entiers à 320px. */
    shortNotice: 'Mentions',
    shortTerms: 'Conditions',
    updated: 'À jour en %s.',
    alsoRead: 'À lire aussi',
    thirdParty: 'Licences des composants tiers',
    /* Sur « à propos », là où l'on vient de lire que rien ne sort de l'appareil :
       c'est la phrase que la page de confidentialité développe, et le seul
       endroit où elle a une chance d'être ouverte. */
    aboutLead:
      'Le détail de ce qui est enregistré et de ce qui ne l’est pas, l’identité de l’éditeur et de l’hébergeur, et ce que le service promet.',
  },

  styleguide: {
    title: 'Styleguide',
    subtitle:
      'Chaque token et chaque composant du design system, dans les deux thèmes et dans la palette choisie.',
    sections: {
      base: 'Palette de base',
      palettes: 'Palettes',
      semantic: 'Tokens sémantiques',
      categories: 'Palette catégories',
      members: 'Palette membres',
      type: 'Échelle typographique',
      shapes: 'Formes et mouvement',
      components: 'Composants',
      icons: 'Icônes',
      kinds: 'Natures',
      bento: 'Grille bento',
    },
    baseNote:
      'Ces valeurs ne sont jamais consommées directement par un composant, et aucune palette n’y touche.',
    /* Ce que la section montre, et ce qu'elle ne montre pas : les six palettes
       dans les deux thèmes, mais pas leurs valeurs — elles sont mesurées par
       `theme/palettes.test.ts`, qui est le seul endroit où elles se vérifient. */
    palettesNote:
      'Six identités, chacune dans les deux thèmes. Les composants n’en savent rien : seule la couche de tokens change.',
    semanticNote: 'La seule couche que les composants consomment.',
    categoriesNote:
      'Six teintes, dans cet ordre, fournies par la palette. Au-delà, les suivantes basculent en gris sous « Autres ».',
    /* Le vert pomme est --accent, donc le signal « actif » et la couleur du
       commun. Le premier membre le portait : sa pastille se lisait comme une
       sélection, et disparaissait dans une pilule de filtre active. */
    membersNote:
      'Les mêmes teintes, moins celle de l’accent, qui dit le commun et l’état actif. Un membre ne la porte jamais.',
    typeNote: 'Archivo pour ce qui se lit, Geist Mono pour les libellés utilitaires.',
    shapesNote: 'Base 4px. Mouvement 160ms, 240ms à l’entrée d’une vue.',
    bentoNote: 'Formats autorisés : 2×1, 2×2, 4×1, 4×2, 6×2. Rien d’autre.',
    iconsNote:
      'Phosphor, graisse bold. Deux emplois et pas un de plus : agir, ou se repérer.',
    iconAction: 'Action — sur un contrôle',
    iconMarker: 'Repère — onglet, tuile, section',
    kindsNote:
      'Le sens dit si l’argent entre ou sort ; la nature dit ce qu’il devient. Une famille porte la nature, ses catégories en héritent.',
    sampleAmount: 'Montant',
    sampleRing: 'Anneau',
    sampleEmpty: 'Aucune récurrence pour l’instant. Ajoute la première.',
    sampleEmptyAction: 'Ajouter une récurrence',
    states: 'États',
  },

  /** Les quatre natures, telles qu'elles se disent à l'écran. */
  kinds: {
    resource: 'Ressources',
    charge: 'Charges',
    debt: 'Crédits et dettes',
    saving: 'Versements',
    resourceShort: 'Ressources',
    chargeShort: 'Charges',
    debtShort: 'Crédits',
    savingShort: 'Épargne',
  },

  /**
   * Jeu de familles et de catégories créé au premier lancement, modifiable
   * ensuite. Les libellés suivent le vocabulaire d'un budget familial, pas
   * celui d'un plan comptable.
   */
  defaultFamilies: {
    resources: 'Ressources',
    housing: 'Logement',
    communication: 'Communication',
    transport: 'Transport',
    daily: 'Vie courante',
    health: 'Santé',
    family: 'Famille et scolarité',
    taxes: 'Impôts et taxes',
    leisure: 'Loisirs et divers',
    credits: 'Crédits et dettes',
    savings: 'Versements',
  },

  defaultCategories: {
    // Ressources
    salary: 'Salaires, retraites ou indemnités',
    benefits: 'Allocations diverses',
    familyBenefits: 'Prestations familiales',
    alimonyIn: 'Pensions alimentaires reçues',
    housingAid: 'Aide au logement',
    rentalIncome: 'Revenus fonciers',

    // Logement
    rent: 'Loyer et charges',
    energy: 'Énergies (électricité, gaz, eau)',
    homeInsurance: 'Assurance habitation',
    housingTax: 'Taxe d’habitation',
    propertyTax: 'Taxe foncière',

    // Communication
    mobile: 'Téléphone mobile',
    internet: 'Internet et téléphone fixe',
    streaming: 'Abonnements TV et streaming',

    // Transport
    fuel: 'Carburant',
    carInsurance: 'Assurance véhicule',
    carMaintenance: 'Entretien et réparations',
    publicTransport: 'Transports en commun',
    tolls: 'Péages et stationnement',

    // Vie courante
    groceries: 'Alimentation',
    clothing: 'Habillement',
    household: 'Produits d’entretien',
    hygiene: 'Coiffure et hygiène',

    // Santé
    healthInsurance: 'Mutuelle',
    medical: 'Frais médicaux',
    pharmacy: 'Pharmacie',

    // Famille et scolarité
    childcare: 'Frais de garde',
    school: 'Scolarité et études',
    alimonyOut: 'Pensions alimentaires versées',
    childActivities: 'Activités des enfants',

    // Impôts et taxes
    incomeTax: 'Impôt sur le revenu',
    otherTaxes: 'Redevance et autres taxes',

    // Loisirs et divers
    outings: 'Sorties et vacances',
    culture: 'Sport et culture',
    gifts: 'Dons et cadeaux',
    misc: 'Divers',

    // Crédits et dettes
    carLoan: 'Automobile',
    mortgage: 'Immobilier',
    leasing: 'Location longue durée',
    consumerLoan: 'Crédits d’achat',
    otherLoan: 'Autres crédits',

    // Versements
    passbook: 'Livrets (A, LEP, CSL)',
    plans: 'Plans (PEL, PEA, compte-titres)',
    lifeInsurance: 'Assurance vie',
    retirement: 'Épargne retraite',
    companySavings: 'Épargne entreprise',

    // Conservées pour les documents antérieurs aux familles
    legacyLeisure: 'Loisirs',
    legacySubscriptions: 'Abonnements',
    otherIncome: 'Autres revenus',
  },

  defaults: {
    /* Où atterrit une ligne dont la catégorie n'existait pas. Le nom dit ce
       qu'il reste à faire, plutôt que ce qui s'est passé : « à ranger » est un
       geste, « catégorie introuvable » est un constat. */
    repairedCategory: 'À ranger',
  },

  a11y: {
    skipToContent: 'Aller au contenu',
    ringLabel: 'Anneau de progression',
    /* Le nom du curseur d'un graphique, et non celui du graphique : l'image
       porte déjà le sien. Celui-ci dit ce qu'on peut faire, pas ce qu'on
       regarde. */
    chartCursor: 'Choisir le mois à lire',
    /* Un raccourci que personne ne découvre ne sert personne — la règle qui
       fait dire les flèches du mois en infobulle. Ici il n'y a aucun bouton à
       survoler : ça se dit donc au lecteur d'écran, sur le curseur. */
    chartCursorHint:
      'Flèches gauche et droite pour changer de mois, Origine et Fin pour les extrémités.',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    /* Un raccourci que personne ne découvre ne sert personne. Il se dit en
       infobulle sur le geste qu'il double — c'est-à-dire au survol, donc
       exactement là où un clavier est branché. Le nom accessible, lui, ne le
       porte pas : « flèche gauche » annoncé par un lecteur d'écran décrit une
       touche, pas ce que le bouton fait. */
    previousMonthKey: 'Mois précédent (←)',
    nextMonthKey: 'Mois suivant (→)',
    newEntryKey: 'Ajouter une dépense (n)',
    /* Même parti que le curseur des graphiques : quarante-deux cases n'ont aucun
       bouton à survoler pour dire leurs touches en infobulle, alors elles se
       disent au lecteur d'écran, sur la grille elle-même. */
    calendarGridHint:
      'Flèches pour changer de jour, Origine et Fin pour les bords de la semaine, Page précédente et Page suivante pour changer de mois.',
  },
} as const

/** La forme d'un catalogue : celle du français, feuilles élargies (`Widen`). */
export type Strings = Widen<typeof fr>
