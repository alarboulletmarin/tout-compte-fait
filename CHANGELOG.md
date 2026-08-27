# Journal des modifications

Toutes les évolutions notables de ce projet sont consignées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et le versionnage la [gestion sémantique de version](https://semver.org/lang/fr/).

Une remarque propre à cette app : comme les données vivent dans le navigateur, toute évolution du modèle de données passe par une **migration de schéma**. Les versions qui en portent une le disent explicitement : c'est ce qui garantit qu'un fichier exporté aujourd'hui se rouvre demain.

## [Non publié]

### Corrigé — fermer l'onglet juste après une saisie ne la perd plus

C'est la famille de pertes qui faisait dire « l'app perd mes saisies », et l'audit en navigateur l'a reproduite au geste près : elle frappait précisément qui range son téléphone juste après avoir noté une dépense.

- **Le foyer qu'on vient de créer s'écrit tout de suite.** La première écriture attendait ses 400 ms de regroupement : recharger ou fermer dans la seconde qui suivait « Commencer » perdait le document *entier*, et l'app rouvrait sur la présentation comme si l'onboarding n'avait jamais eu lieu. Elle part désormais sans délai — seule la première : toute mutation d'après ne risque que sa fenêtre de regroupement, qui garde son sens.
- **Et cette fenêtre-là a maintenant un filet.** Le vidage de sortie de page ouvrait une transaction IndexedDB qui meurt avec la page : une saisie encore en attente — ou partie mais pas commise — se perdait en silence à la fermeture, à la navigation, au retour sur l'écran d'accueil du téléphone. La sortie pose désormais une copie **synchrone** en `localStorage` (`rescue.ts`), que le lancement suivant adopte si la base est restée en retard, et jette sinon — la base fait foi, à la révision près, exactement comme entre deux onglets. Chaque écriture qui aboutit efface le filet : en régime normal, il n'existe pas. Un échec d'écriture le pose aussi à la sortie — la dernière chance d'une mémoire en avance sur un disque qui refuse.
- **Effacer, c'est effacer le filet avec.** La réinitialisation et l'abandon d'un document illisible le retirent : rien ne renaît au lancement suivant de ce que la triple confirmation a promis disparu.
- Pas de migration de schéma : le filet relit par le même chemin que tout document — migrations et validation comprises, il peut avoir été posé par une version précédente de l'app.

### Ajouté — « Réglé par » : la balance entre membres, façon Tricount

*Migration de schéma : version 15.* Rien à convertir, et surtout rien à deviner : le champ est facultatif et n'entre que par le formulaire. L'écriture historique de l'avance — une charge commune attribuée à un membre et cochée « à partager » — reste lisible telle quelle.

- **Je paye, mais c'est pour elle.** La saisie d'une dépense gagne un champ « Réglé par » : qui a sorti l'argent, quand ce n'est pas la personne de la ligne. Alix règle la pharmacie de Camille — la ligne reste à Camille, c'est son coût —, et la répartition inscrit le prêt : « Payé pour quelqu'un d'autre » se déduit du virement d'Alix, « Payé par quelqu'un d'autre » s'ajoute à celui de Camille, et les deux se compensent au centime. Un mois sans charge commune mais où quelqu'un a réglé pour quelqu'un d'autre garde sa carte et sa tuile : le virement n'est plus que ce remboursement-là.
- **Et sur une ligne du pot, c'est l'avance sans détour.** Une charge commune « réglée par » quelqu'un se déduit de son virement sans qu'il ait à s'attribuer la ligne — c'est la réponse propre à « j'ai payé le loyer commun, et l'écran ne le savait pas ». Sur une récurrence, le champ se pose une fois et ses échéances en héritent, comme du partage.
- **Rien ne change aux coûts.** Ce qu'une ligne coûte reste à qui la porte ; seul le virement bouge, et la méthode de l'écran le dit. Égal au membre de la ligne, le champ ne s'écrit pas — une exception, jamais une copie, comme « à partager » — et un « réglé par » qui ne désigne plus personne du foyer se coupe à l'import, comme un membre.

### Corrigé — la répartition suit le salaire du mois qu'on corrige

- **L'échéance du mois passe devant la règle.** Le revenu qui pèse dans le prorata se lisait sur la récurrence seule : corriger la paie d'un mois ligne à ligne — un congé, un salaire réduit — ne déplaçait jamais la part de ce mois-là, et la répartition se lisait figée quel que soit le chiffre saisi. Désormais l'échéance chiffrée du mois l'emporte — confirmée, ou prévue à un montant saisi à la main — parce qu'elle est le fait de ce mois-là ; la règle reste ce qu'elle est, et une prime ponctuelle ne déplace toujours rien. La méthode de l'écran Répartition le dit en toutes lettres.
- **Et changer la règle déplace aussi le mois en cours.** La synchronisation préservait le montant de toute prévue déjà datée, y compris celle restée à l'ancien prix — que personne n'avait tapée : après une hausse, la liste du mois affichait l'ancien montant pendant que le total des récurrences annonçait le nouveau. La synchronisation reçoit maintenant l'ancien prix des appelants qui le connaissent, et ne préserve que les montants réellement saisis. Les échéances confirmées ne bougent jamais, comme toujours.

### Corrigé — « Commun » survit à un détour par l'épargne

- **Le filtre du mois n'est plus écrasé.** Les écrans d'épargne se lisent toujours au nom de quelqu'un — l'épargne n'a pas de lecture au foyer — et ils **écrivaient** pour ça le filtre global : on partait du mois avec « Commun » ou « Tout le monde », on passait par la tuile Capacité, et on revenait filtré sur la première personne du foyer sans avoir rien demandé. La personne se pose désormais **en portée de lecture** (`IndividualScope`, un contexte que `useMonthFilter` sert aux seuls écrans qu'il couvre) : le store n'en sait rien, la pilule active reste juste, et seul un appui explicite sur une pilule change encore le filtre du mois.
- **Le formulaire d'objectif suit la même portée.** Sa liste de comptes à rattacher se lit au nom de quelqu'un, et elle ne tenait jusqu'ici que parce que l'écran précédent venait d'écraser le filtre.

### Modifié — les écrans qu'une tuile du mois ouvre ont leur retour

- **« Capacité d'épargne » menait à un cul-de-sac.** La tuile ouvre `/epargne`, la barre d'onglets y allume « Plus », et l'écran n'avait pas de bouton retour : le seul chemin de sortie était un onglet, c'est-à-dire repartir de zéro. Même impasse sur la Répartition et les Crédits, atteints eux aussi depuis des tuiles du mois — seul « Revenus & charges » avait son chevron. Les trois le portent désormais.
- **Le retour revient d'où l'on vient.** L'écran précédent quand il existe, le mois sinon : arrivé par la tuile, on repart sur elle ; arrivé par un signet ou un rechargement, revenir en arrière sortirait du site et le chevron ramène au mois. C'est la garde que six écrans de saisie recopiaient mot pour mot (`location.key === 'default'`), écrite une fois dans `useBackTo` — les six copies passent par elle, et « Revenus & charges » y gagne un vrai retour d'historique au lieu d'un chemin en dur.

### Modifié — chaque ligne qui montre une entrée est une porte vers sa fiche

- **Un montant qu'on lit se corrige là où on le lit.** Le seul écran qui savait ouvrir la fiche d'une ligne était celui du mois ; Revenus & charges, le détail de la Répartition et les avances du mois affichaient les mêmes entrées en lecture seule, et corriger un montant repéré là demandait de repasser par le mois et de retrouver la ligne. Toutes ces lignes ouvrent désormais `/depense/:id` d'un appui — une copie découpée par la portée garde l'identifiant de l'entrée réelle, donc la porte ouvre la ligne entière : on corrige une ligne, jamais une part.
- **Les prochaines échéances aussi, chacune selon ce qu'elle est.** Une échéance posée dans le document ouvre sa fiche ; une échéance projetée d'un mois jamais ouvert n'existe nulle part, et sa porte honnête est la règle qui la projette. Les lignes passent à 44px — devenues cibles tactiles, elles tiennent le plancher du DS §8, et la tuile vit hors de la grille bento : sa hauteur vient de son contenu.
- Les totaux et les agrégats restent des lectures : une somme n'a pas de fiche.

### Modifié — ce qu'on a déjà avancé se déduit du virement, tout de suite

- **Qui a réglé la facture ne la paie pas deux fois.** Une charge commune réglée par une seule personne — le loyer parti de son compte, l'assurance qu'elle a avancée — comptait dans sa part sans que l'écran Répartition n'en dise rien : « À verser » lui réclamait sa part pleine le mois même où elle venait de sortir l'argent, et la correction n'arrivait qu'au mois suivant, sous le nom de « Régularisation ». Ce détour disparaît : ce que chacun a déjà avancé sur le pot **du mois affiché** se déduit aussitôt de son virement. `À verser = part du pot − déjà avancé`, et quand l'avance dépasse la part, la ligne devient « À recevoir ».
- **La régularisation différée disparaît, parce qu'elle ferait la correction deux fois.** Un virement déjà réduit de l'avance n'a plus rien à rattraper le mois suivant. La section « Ce qui a été avancé » reste, mais elle parle du mois qu'on regarde — confirmé seulement : une échéance prévue n'a été payée par personne, et dire d'elle qu'un membre l'a avancée inventerait un fait.
- **Deux lignes de vérification au lieu d'une.** La somme des parts vaut toujours le pot au centime ; la somme des virements vaut le pot moins ce qui a déjà été avancé, et la seconde ligne le dit — sans elle, un total des virements plus petit que le pot se lirait comme un centime perdu. La tuile « À verser sur le commun » du mois suit le même calcul, ligne « Déjà avancé » comprise, et la page de présentation démontre le nouveau mécanisme comme elle démontrait l'ancien.
- Pas de migration de schéma : rien de stocké ne change, tout est dérivé — le même document se lit simplement autrement, et un mois passé se relit avec la déduction au lieu du report.

### Ajouté — corriger une échéance seule, ou toute la règle qui la pose

- **La question que le formulaire ne posait pas.** Reprendre une échéance générée par une récurrence ne corrigeait qu'elle : on corrigeait le loyer d'août, et septembre retombait sur l'ancien prix sans que rien à l'écran ne dise lequel des deux gestes on venait de faire. Une bascule de portée le demande désormais — « Cette échéance » ou « Toute la règle » —, à la place exacte où une ligne sans règle propose son rythme : c'est la même question, posée à une ligne qui a déjà répondu.
- **Ce qui suit la règle, et ce qui reste à l'échéance.** En portée « règle », le libellé, la catégorie, la personne, le partage et le montant passent sur la récurrence, et les échéances à venir sont refaites dans la foulée — même invariant que toute écriture de règle, même coupure que le panneau de montant des récurrences : à partir des échéances à venir, jamais les mois déjà confirmés. La date, le statut et la note restent à l'échéance ; une règle à montant variable garde son montant à saisir, chaque échéance chiffrant la sienne.
- **La conséquence se lit avant d'enregistrer.** Une phrase sous les bascules dit, pour chaque portée, ce qui va bouger et ce qui ne bougera pas — le pendant de ce que la liste des récurrences écrit déjà sous son panneau de montant.
- Pas de migration de schéma : rien de stocké ne change de forme, seule l'écriture choisit sa cible.

### Modifié — la présentation s'ouvre sur le produit, pas sur ses réglages

- **La langue et le thème rétrécissent.** Ils ouvraient la page en cinq pilules à libellé plein — « Français | English » et « Clair | Sombre | Système » —, soit la largeur entière d'un téléphone occupée par deux préférences secondaires, lues avant le nom du produit. Le parcours de cette page est « produit → promesse → explication → action », et il commençait par « réglages ». C'est désormais « FR | EN » et trois glyphes : cinq carrés de 44px, environ 250px en tout, collés au-dessus de l'étiquette du titre plutôt que séparés par la gouttière de section, où ils formaient une bande à eux seuls que l'œil comptait comme une section.
- **Le contrôle ne change pas**, seulement sa densité : c'est le même `Segmented`, pas un menu ni un sélecteur replié. L'argument qui l'avait mis là tient toujours : on vient le chercher *précisément parce qu'on ne lit pas* ce qui est affiché, et un contrôle qui n'affiche que sa valeur courante demande de l'ouvrir pour savoir ce qu'il propose. « EN » se reconnaît sans comprendre un mot de ce qui l'entoure, exactement comme « English », et pour la même raison qu'une langue se nomme dans la sienne : un code ISO ne se traduit pas.
- **Ce qui rétrécit est la boîte, pas le sens.** Le libellé complet reste le nom accessible de chaque position : un lecteur d'écran annonce « Français » et « Système » là où l'œil voit « FR » et un demi-disque. Sans quoi la bascule du thème, qui n'a plus aucun texte, n'aurait plus rien annoncé du tout.
- **« Système » reste une position visible**, et non un repli derrière un appui long. Un appui long ne s'annonce nulle part et n'existe pas au clavier, ce serait ranger le mode le plus utile là où personne ne le trouve. Mais surtout c'est le **défaut**, donc l'état de presque tous les visiteurs, et une bascule à deux positions ne saurait pas le montrer : ni le soleil ni la lune ne serait allumé, ou l'un des deux mentirait. Un glyphe de plus coûte 44px et dit l'état vrai.
- **Les vues du réglage gardent leurs libellés pleins.** « Apparence » et « Plus » ne bougent pas : on y vient exprès, elles ont le réglage pour titre, et un écran qui traite du thème n'a pas à faire deviner ce que désigne un demi-disque. La densité courte est réservée aux écrans où le réglage n'est pas le sujet.

### Modifié — la simulation répond d'abord, et lit tes comptes ensuite

- **Deux modes, et le simple est celui qui s'ouvre.** L'écran ne savait simuler que les comptes du document : il fallait en avoir, les cocher, et comprendre qu'un rendement se règle compte par compte avant d'obtenir le moindre chiffre. C'est la bonne lecture — celle que personne d'autre ne produit —, mais ce n'est pas la première question qu'on pose. Le mode **simple** tient en trois nombres tapés — un versement, un capital de départ, un rendement — et répond à quelqu'un qui n'a encore rien ouvert ; le mode **mes comptes** est l'écran d'avant, à un appui.
- **Ce n'est pas un second calcul.** Le mode simple emprunte la même `analyse`, le même `projectSeries`, la même figure et le même tableau : une trajectoire au lieu de plusieurs, sommées au même endroit. La calculatrice retirée l'année passée vivait *à côté* des comptes sans dire ce qu'elle simulait ; celle-ci est un mode annoncé, qu'on quitte d'un appui.
- **Les réglages sont revenus sur la page.** Ils vivaient dans cinq feuilles montantes, parce que l'écran tenait dans une hauteur de fenêtre : on ouvrait une feuille pour changer un versement, et la feuille couvrait la courbe qu'on venait voir. Ce qui se règle en un contrôle est à plat — versement, capital, rendement, durée —, ce qui se règle compte par compte garde sa feuille, et la cadence et l'inflation vivent dans un repli. La page défile, dans l'ordre de la question : ce qu'on règle, ce que ça donne, ce que ça ne promet pas.
- **Le rendement du mode simple est un champ, pas une fourchette**, et il s'ouvre sur la valeur la plus modeste que l'app connaisse. La fourchette reste au mode comptes, où l'incertitude se pose là où elle a un sens — un Livret A n'a pas celle d'un PEA. Dans les deux cas l'app ne présélectionne aucun taux flatteur : c'est le contraire des « 11 % constatés sur la dernière décennie » d'un simulateur de vente.
- **La décomposition passe en rangées** sous le chiffre : « Au départ · Versements · Rendement », avec le vocabulaire de la légende de la figure. Une phrase demandait de chercher trois nombres dedans.
- **Les champs vont par paires, dès le plus petit écran.** Empilés, quatre champs et leurs aides poussaient la réponse à huit cents pixels du haut : on réglait un versement sans voir le chiffre qu'il produit. Deux colonnes, et les paires se lisent d'elles-mêmes — ce qu'on verse et ce qu'on a déjà, le taux et l'horizon, la cadence et les euros. La carte des réglages perd un tiers de sa hauteur, et la page quatre cents pixels de défilement sur un téléphone.
- **Les aides disent ce que le champ ne dit pas, et s'arrêtent là.** « Vide : on part de zéro » répétait une invite déjà posée dans le champ ; « aucun taux n'est deviné » se lit dans la valeur d'ouverture et se raconte en entier derrière « Comprendre cette simulation ». Il reste ce qui change ce qu'on tape : le taux se saisit **net**, verser une fois l'an rend un peu moins, chaque montant est déflaté à sa propre date.
- **Une seule forme sur la carte des réglages.** La durée, la cadence et le choix des euros étaient des bascules à pilules — 999 pixels de rayon, deux rangées sous 400 points pour la durée — posées entre trois champs à douze. Deux langages de formes, et le plus bruyant portait le réglage le moins intéressant : on choisit un horizon une fois, on retouche un versement dix fois. Ce sont des listes déroulantes, à la forme des champs voisins. Les deux bascules qui restent ne règlent rien, elles changent de vue : le mode et la lecture graphique/tableau.

### Ajouté — le chevron manquant des listes déroulantes

- **Une liste déroulante annonce qu'elle s'ouvre.** Le contrôle natif est repeint pour prendre la forme des champs de l'app, et ce repeint enlevait la flèche du système sans rien mettre à la place : trente-six pixels lui restaient réservés à droite, vides, et une liste avait l'aspect exact d'un champ de saisie. Le chevron vaut pour tous les formulaires de l'app — saisie, crédits, objectifs, comptes, devise. Il pointe **en bas**, là où celui d'une rangée pointe à droite : l'un annonce ce qui s'ouvre sur place, l'autre promet un écran.

### Modifié — la simulation ne projette plus que des comptes

- **On coche des comptes, et c'est tout.** L'écran demandait d'abord *d'où partir* — quatre nombres tapés à la main, un support, ou « toute l'épargne d'une personne » —, ce qui posait trois questions pour une. La première était une calculatrice qu'on trouve n'importe où ; la troisième additionnait des comptes qui ne suivent pas la même courbe avant de les projeter à un taux moyen qui n'existe pas. Il n'y a plus qu'une liste de cases : chaque compte coché court à **son** rendement et reçoit **son** versement, et la courbe est l'addition de leurs trajectoires. Cocher un seul compte fait de tout l'écran sa trajectoire à lui, et « ces deux comptes-là » n'était exprimable par aucune des trois origines.
- **Trois façons de poser un rendement, une seule à la fois, compte par compte** : le taux de sa fiche — daté, et seul à engager le document —, une valeur qu'on essaie, ou une fourchette. L'écran en proposait quatre *en même temps*, sans qu'aucune ne dise laquelle des autres elle remplaçait. La fourchette reste le défaut d'un compte muet : l'app ne devine aucun rendement, et entre suggérer un chiffre flatteur et montrer un écart large, elle montre l'écart.
- **La cadence des versements**, mensuelle à annuelle. C'est le seul endroit de l'app où une échéance n'est pas ramenée au mois, et c'est délibéré : le calcul capitalise, donc 1 200 € versés une fois l'an rendent moins que 100 € versés douze fois. L'argent passe moins de temps à produire. Ramener la cadence au mois aurait effacé exactement ce qu'on vient mesurer.
- **Dix-sept blocs en moins.** L'écran empilait dix-sept blocs dans une colonne de trois mille pixels : on réglait un taux en bas et on remontait voir ce que ça changeait. Les réglages qui se posent compte par compte deviennent des pilules qui disent **leur valeur** plutôt que leur nom — « 3 comptes », « 2,40 % – 5 % », « 350 €/mois » —, et ce qui se règle ainsi s'ouvre en feuille montante.
- **Le tableau devient une vue, à un appui de la figure.** Il vivait replié sous la courbe et donnait quatre jalons pris aux quarts de l'horizon ; il donne une ligne par année, parce que « combien dans sept ans » est une question qu'on se pose et « au troisième quart de mon horizon » n'en est pas une. Il porte les mêmes séries que la figure : il n'y a pas de second calcul.
- **La figure dit d'où vient le capital**, en trois aires empilées : ce qu'il y avait au départ, ce qu'on a versé depuis, ce que le taux a produit. « ≈ 42 000 € » impressionne ; « 12 000 € versés et 6 000 € de rendement » informe. La borne haute passe au-dessus en trait tireté : une hypothèse, pas une mesure.
- **Ce qui a disparu**, et ne manque pas : le mode « atteindre un objectif » — le verdict d'un objectif y répond déjà, et deux écrans qui répondent à la même question par deux calculs finissent par ne plus donner le même chiffre —, le pas de réglage « et si je versais… », qui posait un second dispositif pour une question à laquelle un champ répond, la simulation libre, et la décomposition compte par compte, qui vit désormais là où l'on coche les comptes.

### Ajouté — une bibliothèque de graphique, pour cet écran et pour lui seul

- **Recharts**, et c'est la seule figure de l'app qui ne soit pas écrite à la main. Les cinq autres tracent une série connue d'avance ; celle-ci est un instrument qu'on manipule, et la bibliothèque apporte ce qui coûterait le plus à réécrire : l'échelle, l'axe, l'infobulle au doigt, la navigation au clavier. Elle pèse 110 Kio compressés, soit vingt fois l'écran qu'elle sert, une dépense assumée, et bornée : elle voyage dans le morceau de la simulation, qui se charge à la demande. Le premier chargement de l'app n'a pas bougé d'un octet, et son budget non plus.


### Ajouté — l'épargne dit si ça va, et pas seulement combien il y a

*Migration de schéma : version 14.* Rien à convertir, et surtout rien à deviner : la collection des objectifs part vide. Aucun document antérieur ne dit ce que quelqu'un vise — ni un support, ni un plafond, ni une récurrence n'en tiennent lieu —, et poser un objectif à partir d'un plafond attribuerait à quelqu'un une intention qu'il n'a jamais formulée.

- **Un objectif est un cap, et ce qui y mène.** Il porte trois choses tapées — ce qu'on vise, pour quand, sur quels comptes — et **rien de ce qui se calcule** : pas de taux, il vient des paliers posés sur ces comptes ; pas de capital, il vient de leurs relevés ; pas de versement obligatoire, il vient des règles que l'app connaît déjà. C'est ce qui le rend tenable, et ce qui fait qu'un relevé saisi sur la fiche d'un compte le met à jour sans que personne y touche.
- **Le verdict est le chiffre de tout ça.** « Sept mois de retard, il faudrait 85 € de plus par mois » demande de croiser un capital, des versements, un rendement et une date : c'est ce qu'aucun relevé de banque ne produit, et la seule raison de rouvrir l'écran quand le capital n'a pas bougé. Il se dit par un **mot** avant d'être une jauge, et par une jauge avant d'être une teinte. Une conclusion qui ne survit pas au niveau de gris n'en est pas une.
- **Aucun rendement n'est deviné.** Un compte qui porte son taux le garde, daté ; un compte muet est projeté à **0 %**. La date annoncée est donc au plus tard et jamais au plus tôt : un verdict qui flatterait ferait rater une échéance à quelqu'un qui l'avait crue tenue.
- **La fiche d'un objectif pose le réel sur le prévu.** Les relevés des comptes rattachés deviennent des points sur la courbe. Aucune donnée nouvelle n'est nécessaire — tout était déjà dans le document —, et c'est ce qui distingue un suivi d'une courbe décorative.

### Ajouté — l'épargne dit **d'où vient** ce qu'on a

- **Une identité, et trois nombres qui s'y referment.** Ce qu'un compte vaut, c'est ce qu'il valait au départ, plus ce qu'on y a versé, plus ce qu'il a produit tout seul. Le troisième est le seul chiffre que ni la banque ni un tableur ne donnent sans travail : il faut connaître **à la fois** les relevés et les mouvements, ce que le document porte depuis le premier jour.
- **Le rendement est mesuré, jamais recalculé.** Ce n'est pas la somme des intérêts d'un barème : c'est `valeur − départ − versé`. Il attrape donc ce qu'aucun taux ne modélise — un PEA qui prend 9 % ou qui en perd 4 —, et il peut être négatif. Sans rouge : un placement qui baisse n'est pas une faute.
- **La légende est un réglage.** Éteindre une couche la retire de la pile *et* de l'échelle. Sur un capital où le départ pèse quarante fois le rendement, les deux couches intéressantes tiennent dans un dixième du cadre ; un appui sur « Au départ » et la figure montre ce que la période a fait, à l'échelle de ce qu'elle a fait.
- **Le simulateur dit ce que fait chaque compte.** Il chiffrait le versé du portefeuille entier, jamais celui d'un compte, alors que deux comptes arrivent au même total par deux chemins qui n'ont rien de commun. Chacun a maintenant sa figure, décomposée comme le passé l'est sur l'analyse, et un tableau donne le versé de chacun, jalon par jalon.

### Supprimé — deux lectures qui ne concluaient rien

- **La pile des comptes dans le temps** répondait à « où est mon argent » : la banque le dit déjà, plus vite et sans qu'on recopie quoi que ce soit.
- **Le cumul des versements de l'année contre l'année d'avant** comptait ce qui sort du compte courant. Du flux pur : il ne savait pas dire si les 4 200 € mis de côté avaient produit quatre euros ou quatre cents.
- L'aperçu de `/epargne` perd donc ses deux chiffres et garde sa porte. C'est un arbitrage d'octets assumé : la décomposition se calcule mois par mois sur toute la fenêtre, et en écrire un seul résultat sur cet écran-là ferait entrer tout ce calcul dans le graphe initial pour une ligne de teaser.

### Ajouté — le simulateur produit quelque chose

- **« En faire un objectif »**, et la simulation cesse d'être un cul-de-sac. Ce qui sort n'est pas la simulation — un taux essayé reste en `localStorage` — mais l'intention qu'on en tire, ce qui est un fait du foyer comme un crédit souscrit. Elle passe par le formulaire d'un objectif, préréglé : rien ne s'écrit sans qu'on ait vu ce qu'on écrit.
- **« Simuler autrement », et « Adopter ce rythme ».** La fiche d'un objectif ouvre le simulateur sur *sa* question — cette cible, cette échéance, ces comptes — et lui dit d'où l'on vient ; la sortie de l'écran devient alors reposer le versement sur cet objectif-là.

### Modifié — le simulateur ne demande plus quelle courbe croire

- **Une fourchette, et non trois hypothèses.** L'écran en comparait trois, plus trois présélections, plus un second taux par compte : quatre mécanismes pour poser une seule chose, l'incertitude. Un placement n'a pas trois rendements, il a une fourchette, et trois courbes obligent à trancher une question qu'aucune donnée ne tranche.
- **Elle ne s'applique qu'aux comptes muets.** Un compte dont le rendement est posé sur sa fiche vaut la même chose des deux côtés : quelqu'un a dit ce qu'il en attend. La fourchette se referme donc d'elle-même sur un portefeuille entièrement renseigné, et la ligne « Rendement » affiche les taux qui **courent** — « 2,40 % – 7 % » pour un livret posé et un plan muet —, jamais les deux champs saisis.
- **Douze contrôles tombent à quatre** : d'où l'on part, combien on verse, sur combien de temps, à quel rendement. Le détail par compte et les euros constants descendent dans la feuille qu'ouvre la ligne du rendement ; le tableau d'effort et son curseur, qui répondaient deux fois à la même question, deviennent deux boutons et un écart.
- **La réponse ne quitte plus l'écran** pendant qu'on règle : régler sans voir ce qu'on change revient à jouer à un jeu dont le score est derrière soi.
- **`/projections` devient `/simulation`**, au singulier : le pluriel nommait une section, c'est-à-dire un endroit où l'on rangerait des projections, ce que cet écran ne fait pas. L'ancienne adresse se redirige.

### Modifié — l'autonomie ne compte plus que ce qui est mobilisable

*Aucune migration.* Le champ `role` est facultatif, et son absence est une réponse : aucun document existant n'en reçoit.

- **« Combien de temps je tiens » divisait tout le capital** par les charges d'un mois : livrets, PEA, assurance-vie en unités de compte confondus. C'était le seul chiffre franchement trompeur de l'app, et il l'était toujours dans le sens qui flatte. Les comptes disent désormais **à quoi ils servent** — précaution, projet, long terme —, et seule la précaution entre dans l'autonomie.
- **Un rôle absent le reste.** Aucune migration ne devine, aucune lecture ne retombe sur un défaut : la tuile pose la question plutôt que d'y répondre à la place de quelqu'un. Le sous-compte se répare d'un geste ; le sur-compte est un chiffre faux qui a l'air d'un résultat.
- **Les comptes se rangent par ce qu'ils demandent**, et non par ce qu'ils pèsent : un relevé attendu remonte. C'est la seule notification que l'app puisse honnêtement produire.

### Modifié — l'épargne cesse d'alterner le patrimoine et le mois

- **Le flux du mois a son écran** (`/epargne/mois`) : capacité, versé, reste, ventilation et les deux boutons de versement. Ils vivaient au milieu de la vue d'ensemble, c'est-à-dire quatre blocs qui dépendent du mois affiché au milieu de trois qui n'en dépendent pas : le patrimoine est ancré sur *aujourd'hui*. La vue d'ensemble n'en garde qu'une tuile et sa porte, et **perd son navigateur de mois**, comme les crédits avant elle.
- **Les objectifs sont au centre optique** : c'est le seul bloc qui conclut, et une section qui conclut ne se descend pas.
- **La rangée de personnes s'efface en solo.** Un contrôle à une seule valeur n'est pas un contrôle, c'était un bruit permanent. Le filtre reste posé dans tous les cas : sans lui, l'écran lirait la somme du foyer, celle qu'il existe précisément pour ne pas montrer.


### Modifié — l'épargne se lit d'abord, se gère ensuite ; les projections répondent avant de demander

*Aucune migration.* Rien ne change dans le modèle de données, seulement dans ce que chaque écran en montre par défaut, et dans ce qu'on peut y faire d'un geste.

- **`/epargne` redevient une vue d'ensemble.** Relever ses comptes et en ouvrir un vivent désormais sur un écran dédié, `/epargne/supports` : la vue d'ensemble n'en garde qu'un aperçu et un lien « Gérer ». Le tracé support par support et le cumul de l'année vivent sur `/epargne/analyse` ; la vue d'ensemble n'en garde que deux chiffres et un lien. Aucun des deux écrans n'est un focus screen : ce sont des destinations pleines, comme `/epargne` elle-même.
- **« Reste à placer » devient « Encore disponible »**, sur l'écran de l'épargne comme sur la tuile du tableau de bord. Le terme voisinait de trop près « Reste à vivre », qui mesure autre chose : un solde de trésorerie, pas une part de capacité d'épargne pas encore versée.
- **Le montant qu'on essaie se reprend d'un geste.** « Et si je versais… » n'était qu'une lecture ; le montant réglé s'applique désormais à la simulation, en coupant le lien vers l'épargne réelle si elle en dépendait : le geste de « Modifier pour cette simulation », déclenché depuis le réglage.
- **Le rendement par compte se replie** derrière la ligne « Rendement » : la ligne par compte reste disponible dès qu'un portefeuille est décomposé, mais n'occupe plus l'écran en permanence.
- **Le versement libre peut reprendre la capacité d'épargne restante** du mois — la même donnée que l'écran Épargne et le tableau de bord, sous le même filtre — d'un bouton, plutôt que d'être retapé.

### Modifié — le plafond de versements retient enfin la main

*Aucune migration.* Le champ existait déjà (`depositCap`, version 10) : c'est ce qu'on en fait qui change.

- **Un versement qui dépasse le plafond ne s'enregistre plus d'un doigt.** Il se saisissait, s'affichait sur la fiche du support, et ne retenait rien : verser 50 € sur un Livret A déjà plein passait sans un mot, ce qui faisait du plafond un réglage sans effet, pire que pas de champ du tout. La saisie chiffre désormais le dépassement et **retient l'enregistrement**.
- **Deux sorties nommées, jamais un refus sec** : verser la place restante — le virement est écrêté, comme dans le simulateur — ou verser quand même. Le second geste existe parce que la place que l'app calcule est **sous-estimée par construction** : le plafond porte sur les versements cumulés depuis l'ouverture, l'app ne connaît que le capital, intérêts acquis compris. Un refus sans issue finirait par refuser un versement que la banque a accepté, et le premier réflexe serait alors d'effacer le plafond. On aurait protégé le chiffre en perdant l'information. Sans relevé, rien n'est retenu : une place inconnue n'est pas une place nulle.
- **Une règle cesse de verser sur un compte plein.** Les échéances à venir sont écrêtées puis ne se posent plus : le prévisionnel annonçait jusqu'ici un capital que la banque aurait refusé de recevoir. Ce qui est daté d'aujourd'hui ou d'avant n'est pas touché : c'est un fait en attente de confirmation, pas une prévision à corriger. Et la **reconstitution d'une avance** en est exemptée : elle rend ce que le support a avancé, et l'écrêter piégerait l'avance dans un reste dû qui ne bougerait plus jamais.
- **L'écran dit quand ça arrivera, et quand c'est arrivé.** Le formulaire d'une règle annonce la date à laquelle elle remplira le compte et le rang de l'échéance ; la ligne d'une règle qui n'a plus de place porte « plafond atteint · en attente de place » ; la fiche du support propose d'arrêter les règles qui le visent encore. Une règle qui cesse en silence d'alimenter le mois serait indiscernable d'une panne.

### Modifié — le formulaire d'un support tient sur un écran

- **Trois questions debout, le reste replié.** Le formulaire posait ses neuf champs à plat, dont cinq facultatifs : sur un téléphone, ouvrir un livret demandait deux écrans de défilement pour trois réponses obligatoires. Restent visibles le nom, le titulaire et le type ; « Le contrat » (rythme des relevés, rendement, plafond) et « Le premier relevé » se déplient. Chaque section porte **en résumé ce qu'elle contient** — « Une fois par an · 3 %/an · plafond 22 950 € » —, si bien que replier ne cache rien, et une section qui porte une erreur s'ouvre d'elle-même.

### Ajouté — une hypothèse de rendement par support, et une projection compte par compte

*Migration de schéma : version 11.* Rien à convertir, aucun support existant ne reçoit de taux, et c'est la seule conversion défendable : l'app ne connaît pas ton contrat.

- **Chaque support peut porter son hypothèse de rendement**, avec le même choix qu'ailleurs : taux garanti ou rendement hypothétique. Facultative, sans valeur par défaut, et sans effet nulle part ailleurs : ni sur ton capital, ni sur la valeur estimée, ni sur la couverture, ni sur un total du mois. Un rendement n'est pas un mouvement. Laissée vide, le simulateur applique l'hypothèse de son propre écran ; posée à 0 %, elle dit que ce capital ne bouge pas. Les deux ne veulent pas dire la même chose.
- **Le portefeuille est projeté compte par compte.** Un Livret A à 2,5 % et un PEL garanti à 1,75 % qui partent de capitaux différents ne suivent pas la même courbe, et leur somme n'est celle d'aucun taux moyen : la trajectoire de l'écran est l'addition des leurs, et il n'existe pas de troisième calcul posé à côté. Chaque compte affiche ce qu'il donne, et dit d'où son taux vient : un compte muet ne doit pas passer pour un compte renseigné.

### Modifié — les projections partent de ton épargne, et répondent avant de demander

L'écran était une calculatrice posée à côté de l'app : il ne lisait rien du document, au motif que rien ne devait y être écrit. Les deux ne se valaient pas. Refuser d'écrire protège les données ; refuser de lire ne protégeait rien : ça obligeait à retaper à la main un capital que l'écran Épargne affiche au centime deux écrans plus haut. Et il fallait traverser presque tout l'écran pour trouver « ≈ 14 k€ », qui est pourtant la seule chose qu'on vient y chercher.

- **Un point de départ** : simulation libre, un support, ou toute l'épargne d'une personne. Le capital estimé et les versements récurrents sont repris tels quels ; ils s'affichent en lecture, jamais dans un champ, et « Modifier pour cette simulation » les recopie dans la saisie en coupant le lien. La lecture est à sens unique : rien de ce qui se simule ici n'est enregistré, n'entre dans un mois, ni ne ressort dans un export.
- **Le rendement, lui, n'est jamais repris.** Un capital et un versement sont des faits ; un rendement futur n'en est pas un, et aucun support n'en porte. Un Livret A dont le taux du jour est connu n'est pas un rendement garanti sur dix ans, il est révisé deux fois par an.
- **Le résultat passe en tête**, avec sa décomposition : capital de départ, versements, rendement, capital projeté, et la part que le rendement pèse dans le total. Un capital projeté est trois choses, et un nombre seul les confond. La tuile « ce que le taux aura produit », qui vivait tout en bas, disparaît : elle en disait la moitié.
- **Le graphique devient la pièce maîtresse.** À une hypothèse, versements et rendement se lisent **empilés** : la hauteur d'une bande est la réponse, et le haut de la pile est le capital. Le tracé se lit au doigt et au clavier, à n'importe quel rang de l'horizon, et non plus aux seuls quatre jalons, qui passent derrière un repli, et portent désormais le versé, le rendement et le total plutôt qu'une colonne de totaux.
- **« Et si je versais… »** : moins, plus, et ce que ça change à l'arrivée. Le pas suit l'ordre de grandeur du versement réel, jamais des paliers que l'app jugerait raisonnables.
- **Le formulaire a fondu.** Le champ de durée ne s'affiche plus à côté des raccourcis qui font la même chose : c'est un cinquième segment qui l'ouvre. Chaque champ porte son unité. « Ce que ça donne / Ce qu'il faut verser » devient « Projeter mon épargne / Atteindre un objectif », et « Garanti / Hypothèse » devient « Taux garanti / Rendement hypothétique ». L'app ne sait pas ce que dit ton contrat, c'est toi qui l'affirmes.
- **Chaque chiffre dit d'où il sort.** Sous « Épargne actuelle », de combien de relevés il est la somme ; sous « Versements prévus », de combien de règles, et que les versements ponctuels comptent dans le capital mais pas là. Dans le résultat, « Versements ≈ 66 k€ » est suivi de « 550 €/mois pendant 10 ans », parce que le chiffre seul fait poser la question au lieu d'y répondre.
- **Une règle qui s'arrête avant la fin de la durée simulée n'est plus comptée.** Le moteur ne projette qu'un versement constant : une reconstitution d'avance qui court six mois y était multipliée par cent vingt. Sur le jeu d'exemple, 66 €/mois ajoutaient huit mille euros à dix ans, de l'argent que personne n'avait l'intention de verser, et qui n'est pas un effort d'épargne : on remet de l'argent là où on l'a pris. Écartées et **comptées**, jamais silencieusement absentes.
- **La lecture en euros d'aujourd'hui se signale avec les chiffres qu'elle change**, sous le résultat, et non trois cadres plus bas : 550 €/mois pendant dix ans qui donnent 66 k€ et non 74 étaient inexplicables à cette distance.
- **Sept paragraphes de pédagogie passent derrière une seule porte**, « Comprendre cette projection ». Chacun était juste ; ensemble ils faisaient une notice intercalée entre des champs, et personne ne lit une notice. La réserve, elle, reste sous le résultat et ne se replie pas : une mise en garde qu'il faut ouvrir pour lire n'en est plus une.

### Corrigé — deux libellés presque identiques sur deux montants différents

« Sa part du mois » annonçait 1 659,83 € sur la tuile du virement, « Part du commun » 1 634,45 € sur celle du coût, à deux cases l'une de l'autre. Deux noms qui disent la même chose, deux nombres à vingt-cinq euros d'écart, et rien pour dire lequel était lequel ni pourquoi. La feuille d'explication le racontait en prose ; le montant qui les sépare, lui, ne s'affichait nulle part.

- **Il a maintenant sa ligne, sur la tuile du virement et sur l'écran Répartition** : « Remboursement d'avance ». Le calcul se lit donc en entier : 1 634,45 € de part du commun, plus 25,38 € de remboursement, plus 129,13 € de régularisation, égale 1 788,96 € à verser.
- **Les deux tuiles portent le même libellé sur le même montant** : « Part du commun », 1 634,45 € des deux côtés. C'est ce qui les rend lisibles ensemble.
- **Le domaine nomme ce qu'il calculait sans le dire.** Une part du pot se décompose désormais en ce qui se consomme et ce qui se rembourse, découpé par le même chemin entrée par entrée : allouer la somme plutôt que chaque ligne ferait diverger les arrondis d'un centime, et ce centime se verrait.
- **Les libellés de « Perso et commun » ne se tronquent plus.** Ils portaient `truncate`, si bien que le retour à la ligne prévu ne se déclenchait jamais : à 320px on lisait « Part du c… ». C'est le montant qui descend, comme le commentaire de la tuile le décrivait déjà.

### Ajouté — « Perso et commun » dit enfin ce que son chiffre représente

C'était la seule tuile de la grille à porter deux montants sans mener nulle part et sans rien expliquer. Sa voisine « À verser sur le commun » ouvre l'écran Répartition, où son calcul est posé ligne à ligne ; celle-ci ne mène nulle part — ses deux moitiés viennent de deux endroits — et n'avait donc aucun endroit où s'expliquer. Devant deux chiffres voisins qui se ressemblent, la question « c'est quoi la différence ? » n'avait aucune réponse à l'écran.

- **Elle ouvre une feuille**, celle-là même que les quatre soldes de la grille du haut utilisent : ce que le chiffre est, **Le calcul**, et **Ce qui le distingue**. Le glyphe d'information au coin, sans nom de destination, parce qu'il n'y en a pas (DS §6).
- **Elle nomme les deux causes de l'écart avec le virement** : la régularisation du mois précédent, et la mensualité d'une avance. Les deux se virent sans rien coûter au mois : un coût est arrêté au mois où la dépense a eu lieu.
- **« Comment c'est calculé », sur l'écran Répartition, cesse de mentir par omission.** Il disait « l'épargne n'est pas partagée » sans réserve, quand l'app elle-même pose l'exception : la mensualité qui reconstitue un livret après une avance est de nature épargne *et* partagée, puisque le foyer rembourse celui qui a avancé. C'est la seule ligne du pot commun que rien n'expliquait, et c'est elle qui fait qu'un virement peut dépasser ce que le mois a coûté.

### Corrigé — « Perso et commun » annonçait un coût plus grand que la tuile Charges

Sur le jeu d'exemple, la tuile Charges disait 1 672,42 € et « Perso et commun » 1 697,80 € pour le même mois de la même personne, 25,38 € d'écart, dans une tuile dont tout le propos est d'éclater le premier chiffre sans le contredire.

L'écart vaut exactement la part d'une **mensualité d'avance**. Quelqu'un règle l'assurance auto du foyer depuis son livret ; l'app pose alors une récurrence qui le reconstitue — de nature « épargne », prise sur la catégorie du support — et la marque « à partager », puisque le foyer la lui rembourse. Cette mensualité est un **virement dû, pas un coût consommé** : elle entre à bon droit dans « À verser sur le commun », et la tuile Charges l'exclut à bon droit aussi, comme tout ce qui sort du compte sans quitter le foyer.

- **La tuile du coût prend désormais la part des seules natures que la tuile Charges compte** — charges et crédits —, là où elle prenait la part du pot entier. Le domaine calculait déjà les deux et le disait ; c'est la tuile qui lisait la mauvaise.
- **Les deux « parts du commun » de l'écran ne sont donc pas le même montant, et c'est correct** : celle du virement (1 659,83 €) comprend le remboursement de l'avance, celle du coût (1 634,45 €) non. Elles portent déjà deux libellés différents : « Sa part du mois » et « Part du commun ».
- Vérifié sur les trois membres du jeu d'exemple : les deux tuiles tombent maintenant au centime.

### Modifié — un anneau sans son tout n'est plus qu'un pourcentage

« À verser sur le commun » dessinait 45,3 % dans un anneau : la part du pot commun que le prorata des revenus met sur la personne filtrée. Or un anneau annonce *une fraction d'un tout*, et ce tout — le total des charges communes du foyer — n'est pas sur la tuile, délibérément : c'est un chiffre qu'on ne doit pas. Restait une jauge sans son tout, c'est-à-dire un pourcentage sans son « de quoi ». Sur l'écran de tout le monde la question ne se pose pas, la tuile Répartition découpe le pot entre les personnes et le tout est sous les yeux ; sous un filtre par membre, elle se posait et rien à l'écran n'y répondait.

- **L'anneau est retiré, et le pourcentage avec lui** : pas remplacé par une version « expliquée » posée à côté. Il sort du revenu de chacun rapporté à la somme des revenus, et c'est cette division-là qu'il faut voir pour l'admettre. L'écran Répartition la montre ligne à ligne, à un doigt d'ici, le prorata contre le revenu dont il vient. Un pourcentage qu'on ne peut pas vérifier sur l'écran où il s'affiche n'explique rien, quel que soit le mot qu'on lui accroche.
- **La règle vise cet anneau-ci, pas les anneaux.** « Perso et commun » en porte un juste à côté sans rien enfreindre : le sien découpe un total qui est au centre du cercle, et ses deux parts se lisent contre lui. Un anneau dont le tout est à l'écran explique ; un anneau dont le tout est ailleurs décore.
- **Le calcul prend la place qu'il libère.** Les deux lignes — sa part du mois, la régularisation — disposaient d'une colonne de 152px à côté de l'anneau, où chaque montant passait sous son libellé ; elles ont maintenant la largeur de la tuile et tiennent chacune sur sa ligne, jusqu'à 320px.
- **Sans régularisation, la tuile passe en `4x1`** : elle ne porte plus que son chiffre, et deux rangées y laisseraient exactement les quarante pixels de vide que le DS §5 reproche à une tuile sans visualisation. Le format suit le contenu : deux rangées quand il y a une addition à montrer, une quand il n'y a qu'un montant.
- Le nom du membre vivait dans la lecture parlée de l'anneau : il passe dans le nom de la région, que rien d'autre ne portait.

### Ajouté — l'app se dit en anglais, et une traduction ne s'arrête pas aux mots

**Migration de schéma : v9 → v10.** Un champ `Settings.locale` s'ajoute — `"fr"` ou `"en"` —, à côté du thème et de la palette. Un document d'avant le champ repart en **français**, et surtout pas dans la langue du navigateur qui l'ouvre : c'est la valeur écrite dans le document qui fait foi, et la deviner ferait changer de langue un même fichier selon l'appareil. Rien d'autre ne bouge.

L'app ne parlait que français, et le disait jusque dans ses conventions. Elle parle désormais les deux, et le choix se fait sur une rangée de « Plus », à côté de la devise, un `Segmented` et non un sélecteur replié, parce qu'on ouvre cet écran-là *précisément parce qu'on ne lit pas* ce qui est affiché : les deux langues sont visibles ensemble, et chacune se nomme dans la sienne, « Français » et « English ».

- **Il n'y a pas d'option « Système »**, contrairement au thème. La langue du navigateur est lue une fois, au tout premier lancement, et devient une valeur écrite dans le document. La suivre en permanence ferait changer de langue un fichier exporté selon l'appareil qui l'ouvre, ce qu'un réglage porté par le document sert justement à empêcher.
- **La traduction ne s'arrête pas aux chaînes.** Le français écrit « 1 284,50 € », pose une espace fine devant le symbole et le pourcent, compte en octets et dit « le 5 » ; l'anglais écrit « €1,284.50 », n'en met aucune, compte en bytes et dit « the 5th ». Ces règles-là ne tiennent dans aucun catalogue : elles vivent dans `i18n/format.ts`, à côté de l'élision de « de » qui y vivait déjà, et `<Amount />` place le symbole du côté que sa langue lui donne. Une app dont on n'aurait traduit que les phrases aurait affiché des montants français sous une interface anglaise, et personne n'y aurait vu un bug tant qu'on ne regarde que les mots.
- **Le catalogue par défaut suit la langue du moment**, et lui seul : un foyer créé en anglais n'hérite plus de quarante-six catégories françaises. Ce qui est déjà saisi ne bouge pas : le nom d'une catégorie est une donnée du foyer, comme un prénom de membre, et repasser l'app en français ne réécrit pas ce que quelqu'un a pu modifier depuis.
- **Les trois pages juridiques sont traduites, pas réécrites.** Le droit ne suit pas la langue de lecture : l'éditeur reste une personne physique française, l'hébergeur le même, la LCEN et le RGPD s'appliquent toujours, et les conditions restent soumises au droit français. Les références aux textes gardent leur nom d'origine : « article 1-1 of the LCEN » se retrouve, une traduction du nom de la loi ne se retrouve pas.
- **Les cinq écrans qui portent leur propre catalogue** — la présentation, les pages juridiques, l'historique et les projections — emportent chacun leurs deux langues dans le même morceau : ils sont déjà chargés à la demande, et un second aller-retour de réseau pour quelques kibioctets de prose coûterait plus cher que de les emporter ensemble.
- **L'anglais arrive par le réseau**, et c'est ce qui permet de l'ajouter sans le faire payer à tout le monde : le catalogue français reste dans le graphe initial — c'est la langue par défaut, et le repli si le morceau n'arrive pas —, l'anglais est un `import()` que le démarrage attend avant le premier rendu. Seize kibioctets qui ne pèsent que chez qui les lit. Le premier chargement passe tout de même de 217,6 à 220,2 Kio compressés, et **le budget de `scripts/size.mjs` de 221 à 224** : la machinerie de langue, le glyphe du réglage et les branchements de mise en forme sont lus avant le premier pixel. Le chiffre est relevé pour la marge et non pour le poids : elle retombait à huit dixièmes de kibioctet, ce que ce fichier appelle lui-même un plafond, et une langue de plus ne doit pas se payer sur la place qui reste aux suivantes.

### Modifié

- **Les composants ne lisent plus `fr` mais `t`**, le catalogue actif (`i18n/strings.ts`). Deux règles en découlent, écrites dans le module et dans l'architecture : rien ne lit `t` à l'évaluation d'un module — cent soixante et onze tables de libellés construites au chargement sont devenues des fonctions appelées au rendu —, et changer de langue remonte l'arbre, ce qui garantit qu'il n'y reste aucun mot d'avant.
- **`mirrorAppearance` mire trois réglages au lieu de deux.** La langue est celui des trois dont l'oubli coûterait le plus cher : le thème se rattrape en une frame, quand un catalogue mal choisi doit être téléchargé avant de pouvoir l'être.


### Ajouté — l'épargne répond à ce que la banque ne sait pas, et cesse de réclamer ce qu'elle sait déjà

**Migration de schéma : v8 → v9.** Un champ `SavingSupport.pace` s'ajoute — `"yearly"` ou `"quarterly"` —, et il est le seul du modèle dont l'absence n'est **pas** remplacée par une valeur par défaut à l'import : un document d'avant le champ n'a jamais répondu à la question, et écrire « annuel » sur sept supports ferait passer un silence pour sept choix. L'app lit « annuel » sans l'écrire, et le formulaire recueille la vraie réponse quand on la lui donne. Rien d'autre ne bouge.

L'écran de l'épargne répondait à « combien j'ai ». C'est la question où il ne peut pas gagner : l'appli de la banque y répond mieux, plus vite, sans qu'on saisisse quoi que ce soit, et sans se tromper. Chaque relevé demandé était donc une **transcription** : recopier un nombre lu trente secondes plus tôt ailleurs. Ce que cette app est seule à savoir, c'est ce qui *nourrit* le capital : elle tient le stock et les flux, quand la banque voit un solde sans savoir lesquelles des sorties sont des charges et lesquelles sont des virements vers soi-même.

- **« Tu tiens 4,2 mois sans revenus »**, sous le capital. C'est le fonds d'urgence — capital estimé ÷ charges d'un mois moyen —, la première chose que regarde n'importe quel conseiller, et il est *arithmétiquement impossible* sans les charges de l'app. Trois décisions font sa justesse, et aucun autre écran ne les dit : les **mensualités de crédit comptent** au dénominateur — elles ne s'arrêtent pas quand le revenu s'arrête —, les **versements d'épargne non** — c'est la première chose qu'on coupe —, et le **mois en cours ne compte pas**, faute d'avoir tout dépensé. Les trois sortaient pourtant du même compte : lus en trésorerie ils se confondent, et qui met 500 € de côté chaque mois se serait vu tenir un tiers de temps de moins qu'il ne tient. D'où une série mensuelle **consciente des natures**, à côté de celle qui ne connaît que les entrées et les sorties.
- **La moyenne porte sur les douze derniers mois vécus**, jamais sur douze cases : diviser par douze un foyer qui saisit depuis trois mois inventerait neuf mois sans charges, et doublerait le chiffre annoncé. Faute d'un mois complet ou d'une charge, l'écran **nomme ce qui manque** plutôt que d'écrire « 0 mois » : un quotient sans dénominateur ne vaut pas zéro, il ne veut rien dire.
- **Le cumul des versements, mois après mois, année contre année d'avant.** L'app est une machine à mois : tout y est borné par le mois affiché, et l'épargne est la seule notion qu'on y ait greffée qui n'ait aucun sens à l'intérieur d'un mois. On voyait douze états mensuels, jamais une trajectoire, alors que la donnée était intégralement là depuis le premier jour, et que la machine à cumuler existait déjà, testée, pour le solde de l'historique. Elle n'était pas branchée. **Aucun relevé n'y entre**, aucune saisie nouvelle : la question ne se posait simplement nulle part.
- **Un relevé est un arrêté, pas une corvée mensuelle.** Chaque support porte désormais son rythme. Un livret réglementé ne bouge que des versements — que l'app connaît — et d'intérêts capitalisés une fois au 31 décembre : sa valeur est déterministe entre deux relevés, et un relevé **par an** suffit. Un PEA, un compte-titres, une assurance-vie en unités de compte se relèvent au **trimestre**. Le seuil unique de six mois se trompait dans les deux sens à la fois : il déclarait « à actualiser » un Livret A dont l'app connaît le capital à l'euro près, et laissait passer pour frais un PEA que le marché avait refait.
- **Et l'écran se tait le reste du temps.** « Mettre à jour les relevés » laissait entendre un rituel mensuel, qui n'est la bonne cadence d'aucun support. Le geste reste atteignable en permanence, mais son **poids dit s'il y a quelque chose à faire** — appuyé quand un support a dépassé sa cadence ou n'a jamais été relevé, discret sinon —, avec un décompte, « 2 relevés à faire », qui ne s'écrit que lorsqu'il a quelque chose à écrire. Ni couleur ni panneau : un capital qu'on n'a pas revu n'est pas une erreur, et un écran qui réclame une donnée dont il n'a pas besoin ne produit que de la culpabilité.
- **Aucun taux, aucune projection, aucun intérêt calculé.** La cadence dit quand un relevé sera *redemandé*, jamais ce que le support rapportera d'ici là. Elle se demande plutôt qu'elle ne se déduit du classement, parce que le catalogue de catégories est libre : rien ne garantit qu'un « Livret A » soit rangé ailleurs que sous « Divers », et une cadence lue sur le classement se tromperait en silence, le défaut même qu'elle existe pour corriger.

Le budget de taille passe de 217 à 221 Kio, et c'est la **marge** qu'il relève, pas le poids : l'app en pèse 216,5, et le rangement de « Plus » l'avait laissée à un dixième de kibioctet, un plafond et non une marge. Le graphique de l'année n'y entre pour rien : sa section part à la demande, et les lignes cumulées qu'elle partage avec l'historique vivent dans un morceau à elles. Mesuré sans ce découpage, le premier chargement prenait quatre kibioctets de plus, pour un bloc qui vit sous le pli.

### Modifié — le jeu d'exemple passe de quinze mois à cinq ans, et cesse d'être une capture

Quinze mois montraient des lignes. Ils suffisaient à remplir les écrans, et c'était là toute leur ambition : une courbe qui ne soit pas plate, une répartition qui ne soit pas un miroir, un capital restant dû qui ne soit pas le capital emprunté. Mais un foyer ne se lit pas en quinze mois : il s'y répète. Tout ce que cette app peut apprendre sur une vie financière, elle l'apprend des **bascules**, et une bascule demande qu'il y ait un avant et un après.

Le document couvre désormais **cinq années pleines**, mois courant compris, et son contenu a changé de nature avec sa durée.

- **Un crédit auto va à son terme, un autre le remplace** le mois suivant, sans qu'un seul mois porte les deux mensualités. C'est la forme qu'un poste de dépense prend quand il dure plus longtemps qu'un crédit, et elle ne tenait pas dans un an et demi.
- **Le foyer est locataire, puis propriétaire.** Au dix-huitième mois, le loyer cesse ; une mensualité, une taxe foncière, une redevance d'ordures et une assurance habitation qui double le remplacent. Une reprise de vingt-quatre mille euros sur le livret paie les frais de notaire, le déménagement et l'installation, au centime. C'est le seul décrochement de cinq ans de courbe d'épargne, et il est expliqué par les trois lignes qui le suivent.
- **Un alternant est embauché** au vingt-quatrième mois : sa prime d'activité s'éteint, son revenu triple, et le prorata des charges communes bascule sous les yeux, de 9 % à 23 % de ce que le foyer partage.
- **Un studio est mis en location** au trentième : un second crédit immobilier, un loyer perçu qui n'est pas un salaire, une seconde taxe foncière, une assurance qui n'est pas celle du logement habité, et des charges de copropriété trimestrielles. C'est le premier emploi honnête de la catégorie « Revenus fonciers », et l'occasion de montrer qu'un revenu locatif a quatre lignes en face de lui qu'aucune vue ne rapproche.
- **La crèche cède la place à l'école**, l'éveil musical au club de football, un PEE fermé à celui de l'entreprise suivante. L'archivage cesse de se lire comme une fin : les deux comptes coexistent dans le document, même personne, même catégorie, un seul qui reçoit encore.
- **Les prix ont cinq paliers, et non un changement isolé.** Le salaire connaît quatre augmentations, la mutuelle quatre hausses, la pension alimentaire quatre indexations, l'impôt quatre révisions. « Le prix a changé une fois » est une anecdote ; cinq paliers disent si une charge dérive ou suit l'inflation, et c'est la seule chose que la fiche d'une récurrence est seule à savoir.
- **La même avance revient quatre années de suite** — la prime d'assurance auto, réglée en une fois depuis le livret et remise mois par mois —, dont trois entièrement reconstituées et une en cours. Une avance isolée ressemble à une dépense compliquée ; quatre d'affilée montrent que c'est une **façon de payer**. La récurrence mensualisée qui les précédait est restée dans le document, arrêtée : les deux montages se lisent côte à côte, même catégorie et même voiture.
- **Trois crédits soldés, pour deux raisons différentes.** Les deux sans intérêt retombent à zéro par soustraction : ce qu'on a versé est exactement ce qu'on devait. Celui à taux a coûté treize mille euros pour douze mille prêtés, et aucune soustraction ne pouvait le dire.

Deux détails techniques valent d'être signalés parce qu'ils touchent ce que les écrans montrent. Les **montants variables se lisent désormais par mois calendaire** — douze valeurs saisonnières plus la dérive de l'année — là où ils suivaient le rang du mois dans le document : le comparatif d'années oppose enfin mars à mars, et non le quatrième mois au seizième. Et les tables des dépenses ponctuelles ont des longueurs premières entre elles, jamais douze, sans quoi cinq années auraient été rigoureusement identiques.

Le catalogue par défaut est employé à quarante-quatre catégories sur quarante-six ; restent l'aide au logement, que ces revenus interdisent, la taxe d'habitation, qui ne s'applique ni à la résidence principale ni à un bien loué, les pensions alimentaires reçues, qui raconteraient une histoire familiale qu'un exemple n'a pas à trancher, et la location longue durée, qui est justement celle qu'on archive. Le document pèse environ 2 500 échéances et 500 kio sérialisés, monté en une fraction de seconde à chaque chargement.

### Ajouté — onze scénarios dans un vrai navigateur, que le jeu d'exemple rend possibles

Le dépôt avait mille quatre cents tests et aucun ne lançait l'app. Ils montent des composants dans jsdom, avec `fake-indexeddb` là où le stockage compte : la bonne granularité pour presque tout, et un angle mort pour quatre choses qui ne cassent qu'en production. Le **chargement paresseux** (l'exemple, le schéma, la présentation arrivent par `import()`, qu'un test jsdom court-circuite en important le module directement), la **mise en page** (jsdom rend tout à zéro pixel : « ça déborde » n'y veut rien dire), le **stockage réel** (`fake-indexeddb` est une réimplémentation) et la **taille du document**.

Ce qui manquait pour les combler n'était pas un outil, c'était un **document**. Un scénario de bout en bout a besoin de données complètes, et il aurait fallu les saisir écran par écran, donc écrire, en préambule de chaque scénario, un second jeu de données à maintenir, qui aurait divergé du premier au premier changement de modèle. Le jeu d'exemple passé à cinq ans est ce préambule : un clic, un document déterministe, tous les états peuplés.

`npm run e2e` joue donc onze scénarios dans Chromium, sur `dist/`, sur ce qui serait déployé, jamais sur ce qu'un serveur de développement assemble à la volée.

- **Chaque écran s'ouvre sans une erreur** : console, exceptions et requêtes échouées sont collectées du premier octet, et la liste doit être vide. Une requête qui échoue est un bundle qu'on n'a pas su aller chercher, et c'est exactement ce qu'aucun test jsdom ne peut voir puisqu'il n'en demande aucun.
- **Le document survit à un rechargement, et à un second onglet.** C'est la promesse de la première ligne du README, vérifiée contre IndexedDB plutôt que contre sa réimplémentation. L'export produit un fichier qui pèse ce que pèsent cinq ans.
- **Aucun écran ne déborde à 320 points de large**, jeu d'exemple chargé : la borne basse que le design system s'impose, et la vérification qu'aucune relecture ne fait de façon fiable. Le document vide ne débordait jamais : ce sont les montants à sept chiffres et les listes à quinze lignes qui poussent les murs.
- **Les états que seuls cinq ans produisent sont lus à l'écran** : trois crédits soldés à zéro, la même avance répétée quatre années de suite, deux supports d'épargne qui réclament un relevé pendant que six se taisent, trois parts inégales dont la somme vaut le total.

Deux décisions valent d'être dites. **Aucune assertion ne porte sur un calcul** : les chiffres sont vérifiés par les tests du domaine, qui le font mieux et mille fois plus vite ; ici on vérifie qu'ils arrivent jusqu'à l'écran. Et **rien n'est figé sur une valeur** : le jeu est ancré sur la date du jour, donc on lit des formes (un montant plutôt qu'un tiret, « n / m » avec n < m) et jamais des montants, sans quoi le test se périmerait au mois suivant.

`e2e` reste **hors de `verify`** : c'est la seule vérification du dépôt qui exige un navigateur, et faire dépendre la porte de sortie d'un téléchargement de 150 Mio la rendrait inutilisable là où elle sert le plus, sur une machine qui vient de cloner. La CI la joue dans un second travail, en parallèle, avec la même commande qu'en local ; aucune commande n'existe que dans le fichier de CI.

### Corrigé — « Comparer » dit enfin ce que ses chiffres comptent

Les deux comparaisons de l'historique posaient trois montants sans jamais nommer la grandeur qu'ils mesurent. On lisait « 2026 · 9 994 € », « 2025 · 1 489 € », « Écart · +8 505 € » sous le mot « mai » : de quelle année vient chaque nombre, c'était clair ; ce qu'il compte, jamais. Un chiffre juste qu'on ne sait pas lire se lit comme un chiffre faux.

- **Le cumul annuel porte son nom à l'œil.** « Cumul du solde depuis janvier » s'écrit au-dessus de la lecture, là où l'information manquait. Le graphique avait pourtant déjà ce nom, dans l'`aria-label` du tracé, c'est-à-dire pour les seuls lecteurs d'écran : la lecture accessible existait, la lecture visible n'existait pas. Sans elle, rien ne tranchait entre « le solde de mai » et « tout ce qui s'est accumulé de janvier à mai », deux nombres différents pour la même position du curseur. La chaîne est la même des deux côtés, et elle a changé de sujet au passage : « mois après mois » décrivait la forme de la courbe, pas ce qu'elle empile.
- **L'écart entre deux mois dit son périmètre et son sens.** « Écart des sorties, du mois de référence au mois comparé » : la liste ne compare que les sorties — les entrées n'y sont jamais entrées — et un « +150 € » ne dit pas de lui-même dans quel sens il se lit. Deux règles qui n'étaient écrites nulle part, et qu'un signe ne suffit pas à porter. La phrase ne suit pas les rangées repliées : celles-ci montrent un montant et non un écart, et leur propre phrase le dit déjà.

### Modifié : ce qu'un mois coûte et ce qu'il fait verser cessent d'être le même chiffre

La carte « À verser sur le commun » portait trois montants assis sur deux bases différentes. Le chiffre de tête — 2 015,42 € — est un **virement** : la part du pot commun, plus la régularisation du mois précédent. Les deux lignes en dessous — « Charges perso » 72,87 € et « Total à payer » 1 805,73 € — sont un **coût**, dont le report est exclu par construction : ce qu'une dépense a coûté à quelqu'un est arrêté au mois où elle a eu lieu, seul le virement se rattrape. D'où l'anomalie qu'on lisait tous les mois : un « Total à payer » **plus petit** que le « À verser » posé juste au-dessus, dans une carte dont le seul métier est le virement.

- **La carte du virement ne parle plus que du virement**, et elle pose son calcul au lieu de le taire : sa part du mois, plus la régularisation, égale ce qu'elle verse. Les mots et l'ordre de l'écran Répartition, où le même calcul se lit déjà. Deux écrans qui montrent le même chiffre doivent le montrer de la même façon, sinon c'est deux chiffres.
- **La régularisation se lisait deux fois.** Elle était déjà comprise — silencieusement — dans le chiffre de tête, et s'affichait une seconde fois en carte autonome juste en dessous. Rien ne disait que les deux montants voisins ne s'ajoutaient pas, et deux montants voisins dont rien ne le dit s'ajoutent. Elle redevient un terme du calcul, sur la tuile dont elle change le montant, et ne se lit qu'aux mois où elle existe.
- **Une tuile « Perso et commun » répond à la question que l'autre répondait mal** : ce que le mois coûte à quelqu'un, éclaté en ses lignes à elle et sa part du pot. C'est la seule chose que ses chiffres ne disaient jamais : le découpage du prorata fond les deux dans chaque total, sans quoi chacun se lirait comme s'il vivait sans loyer, et une fois fondus plus rien ne sépare ce qu'on décide seul·e de ce qui se décide à deux. Son total est celui de la tuile Charges au centime : elle ne le contredit pas, elle l'éclate, et c'est ce qui interdit d'y arrondir.
- **La cascade de la capacité d'épargne nomme son troisième terme.** Elle disait « Charges » d'un bloc là où le montant mêlait les deux, sur l'écran qui sert précisément à décider quoi changer. Elle dit maintenant « Charges perso », « Crédits perso » et « Part du commun », crédits communs compris, la légende le précise. Les termes redonnent la capacité au centime : ce sont les mêmes totaux, seulement séparés. Sans prorata calculable, il n'y a aucune part à distinguer et la cascade reprend ses termes d'origine.
- **Le mois où le report est le seul virement garde sa lecture.** Sans charge commune, l'ancienne tuile s'effaçait et c'est la carte de régularisation qui tenait seule ce cas ; elle n'existe plus, donc la carte du virement reste debout. Son montant garde alors son signe : qui a trop avancé le mois d'avant **reçoit** au lieu de verser, et l'annoncer comme une sortie disait « 282,56 € à verser » à qui on devait 282,56 €. Même correction sur l'écran Répartition, qui avait la même.

Aucune migration de schéma : rien de ce qui est enregistré ne change, seulement la façon dont les mêmes montants se lisent.

### Modifié — « Réglages » disparaît, et « Plus » range par intention

« Réglages » ne nommait pas une intention, il nommait ce qui restait. Derrière ce mot vivaient les personnes, le catalogue des catégories, l'apparence, la devise, le stockage, l'export/import et « à propos » : sept destinations de six natures différentes, présentées par l'écran « Plus » comme une porte unique. Et le mot mentait sur trois d'entre elles au moins : qui compose le foyer et sous quelles étiquettes on classe sont **la structure du budget**, pas une préférence d'application, et sauvegarder ses données n'est pas un goût.

- **Quatre groupes, sur le critère « avec quelle intention vient-on ? »** : **Gérer** (récurrences, épargne, répartition, crédits), **Organiser** (personnes, catégories), **Données** (sur cet appareil, exporter/importer), **Application** (apparence, devise, à propos). Trois verbes et un nom, parce que le quatrième ne se fait pas. « Organiser » plutôt que « Configuration », qui retomberait dans le générique de « Réglages », et plutôt que « Budget », que les quatre écrans de « Gérer » composent tout autant.
- **La page d'entrée des réglages est supprimée**, et les cinq vues remontent d'un cran : `/personnes`, `/categories`, `/apparence`, `/stockage`, `/donnees`. « Plus → Réglages → Catégories » devient « Plus → Catégories », et « Plus → Réglages → Données → Exporter/importer » devient « Plus → Exporter/importer ». Un niveau de navigation pour quatre options n'était plus un rangement, c'était un détour.
- **Les anciennes adresses répondent encore.** `/reglages/…` redirige par simple retrait du préfixe — aucun segment n'a été renommé au passage, exprès —, si bien qu'un signet sur `/reglages/categories/fam-1/nouvelle` retrouve le formulaire qu'il visait et pas seulement l'accueil de la section. Même filet que `/abonnements`, et même motif.
- **Chaque rangée porte le glyphe de sa destination**, celui-là même que la colonne latérale affiche à la souris. C'était le manque de cet écran sous 1024px : la barre d'onglets ne porte que quatre repères, et tout ce qu'elle range se parcourait en lisant onze libellés de haut en bas. Le DS §9.2 demande qu'un concept garde le même glyphe partout : la colonne l'appliquait, « Plus » ne l'appliquait pas. Le repère est atténué comme le chevron d'en face, et les deux ne se doublent pas : l'un dit *vers quoi*, l'autre *qu'on y va*.
- **Chaque rangée dit sa valeur** — « Maison · 3 membres », « 47 catégories · 12 familles », « Système · Classique », « Version 1.0.0 » — ou, quand elle n'en a pas, une phrase. Jamais un chiffre du budget : les écrans qui les calculent les disent déjà, et un second tableau de bord serait en retard d'une règle sur le premier. L'écran est un peu plus long qu'avant, et c'est le bon échange sur un téléphone : quatre groupes qu'on comprend en les balayant valent mieux qu'un écran court qui oblige à en ouvrir un autre pour savoir ce qu'il contient.
- **La colonne latérale nomme « Plus » au lieu de le déplier**, et c'est un revirement assumé. Elle le dépliait tant qu'il tenait en deux groupes ; il en porte quatre, les onze destinations la doubleraient, et l'un des groupes n'est pas fait que de liens : la devise se règle dans un sélecteur, et une colonne de navigation n'héberge pas un champ de formulaire. Aucune porte n'est perdue : ce qu'elle montrait d'un clic, elle le montre encore, et ce qui vivait derrière « Réglages » vit derrière « Plus », au même rang qu'avant.
- **Rien du langage visuel ne change** : mêmes tuiles, mêmes filets, mêmes étiquettes en capsule, même rangée à titre, description et chevron. Le défaut n'était pas dans le dessin, il était dans le rangement.

Deux glyphes nouveaux : `TransferIcon` (deux flèches opposées, ce qui sort et ce qui rentre) et `CurrencyIcon` (un billet, le seul glyphe d'argent sans symbole monétaire gravé : sur le réglage qui choisit lequel afficher, un « $ » aurait dit le contraire de ce que fait le sélecteur).

Le budget de taille passe de 214 à 217 Kio, et deux kibioctets en sont la mesure exacte : un demi pour la page absorbée — « Plus » est un onglet de la barre, il ne peut pas se charger à la demande —, un et demi pour les sept définitions de glyphes qui remontent dans le graphe initial avec les repères.

### Ajouté : la promesse se lit avant la première saisie, pas dans les pages qu'on ne lit pas

« Pas de compte, pas de serveur » était écrit quatre fois : sur la présentation, à la dernière étape de l'onboarding, sur « à propos », et en détail sur la page de confidentialité. Toutes se lisent, et c'était exactement le problème : quelqu'un qui arrive méfiant devant une app de finances saisissait ses revenus sans en avoir croisé une ligne. La promesse était partout sauf devant lui.

- **Une notice bloquante au premier lancement**, une seule fois par navigateur et pour tout le monde, quel que soit l'écran d'arrivée. Elle dit les quatre choses que l'app ne fait pas de ce qu'on y écrit : aucun compte, aucun cookie ni traceur, aucun serveur, personne qui lise les données. Elle mène à la page de confidentialité. C'est un bandeau cookies retourné, et la forme est empruntée exprès : là où l'un fait accepter ce qui est pris, celle-ci dit ce qui n'est pas pris. Elle bloque pour la seule raison qui rend un bandeau cookies efficace, c'est-à-dire qu'on ne peut pas ne pas le voir.
- **La case est là pour qu'on lise, pas pour qu'on réponde.** Elle allume le bouton « J'ai compris », et c'est tout ce qu'elle fait : rien n'est enregistré de ce qu'elle vaut. C'est ce qui distingue la notice d'une question, et ce qui laisse intact le « rien à configurer pour démarrer » du cahier §1 : elle ne configure rien et ne demande aucune information sur qui la lit. Le nom du foyer reste supprimé pour la raison inverse : il exigeait une réponse sur soi, et pour une décoration.
- **Aucune des quatre lignes ne dit « aucun traitement de données ».** Servir la page laisse une trace dans les journaux de l'hébergeur, la page de confidentialité le dit depuis toujours, et une notice faite pour être crue ne peut pas se faire prendre sur la seule ligne qu'on puisse vérifier. Les quatre portent donc sur ce que devient *ce qu'on saisit*, ce qui reste vrai ; la nuance se lit sur la page, à un lien de là.
- **« Pourquoi il n'y a pas de bandeau cookies » devient « Pourquoi il y a une notice, et pas un bandeau de consentement ».** La section disait qu'un bandeau n'aurait rien à faire consentir et ferait cliquer pour rien : c'est toujours vrai d'un bandeau de *consentement*, et la page le dit maintenant dans ces mots-là. Ce qui s'ajoute est une notice d'information, qui ne demande pas d'accepter, ne propose pas de refuser, et dont la fermeture ne change rien à ce que l'app fait.
- **L'énumération du stockage local est corrigée**, et c'est plus qu'un détail : toute la crédibilité d'une notice qui affirme ne rien collecter repose sur l'exactitude de la liste de ce qui est écrit. Elle annonçait trois réglages quand il y en avait quatre, la palette manquant depuis que les six palettes existent, et il y en a cinq maintenant, tous nommés.
- **« Tout effacer » cesse de promettre qu'il ne reste rien.** La page disait qu'il « ne laisse rien derrière » ; elle dit maintenant qu'il ne laisse rien *de tes données*, et nomme les trois choses qui restent, le thème, la palette et cette notice, avec la raison : aucune ne parle de tes données. C'était déjà vrai du thème avant cette version.
- **Ni croix, ni Échap, ni clic sur le fond, ni glissement** : `Sheet` accepte `dismissible={false}`, et c'est le seul écran qui y a droit. Il n'y a pas de « non » à offrir puisqu'il n'y a rien à accepter, et une sortie sans mot ferait passer pour un refus le fait d'avoir cliqué de travers. Ce n'est pas un piège au sens de WCAG 2.1.2 : la case répond à la barre d'espace, le bouton à Entrée, donc la sortie existe au clavier ; elle est simplement nommée.
- **Le texte de la feuille est désigné, et la feuille prend le focus.** Les deux vont ensemble, et le premier ne valait rien sans le second : `showModal()` visait le lien « Confidentialité » au milieu du corps, dont un lecteur d'écran annonçait le nom *à la place* de la description qu'on venait de poser.
- **La case vit en fin de corps, pas dans le pied**, où elle a d'abord été posée : le pied est hors du défilement, donc sur un téléphone de 320 on cochait « J'ai lu » sans avoir fait défiler une seule des quatre lignes. Mesuré : 304 pixels de fenêtre pour 453 de texte.
- **Trois familles d'écrans ne la reçoivent pas.** Les trois pages juridiques, parce qu'elle y mène : la modale recouvrait la page que son lien venait d'ouvrir, on ne voyait rien se passer, et le lien passait donc pour cassé. Le nuancier, qui n'est pas un écran de l'app et qui existe pour inspecter les composants, celui-ci compris. Et un document qui ne s'ouvre pas : l'écran d'arrivée porte alors les quatre recours du cahier §5, et retarder un sauvetage de données pour une formalité serait le pire moment de toute l'app pour bloquer. Dans ces deux derniers cas, rien n'est retenu : elle est due, elle est seulement remise.
- **Elle se referme sans se démonter**, pour que l'animation de sortie ait encore un nœud à animer : la feuille de style la porte depuis toujours, et la démonter l'escamotait d'un coup.
- **Fermer la notice survit à « Tout effacer ».** Le drapeau vit hors du document, comme le thème et la palette, et pour la même raison : il décrit ce qu'on a lu, pas l'état des données. Les deux dates d'export, elles, partent à l'effacement parce qu'elles décrivent des données qui ne sont plus là. Rouvrir une modale bloquante devant quelqu'un qui vient de tout effacer serait une punition.

### Ajouté — l'export peut partir vers un autre appareil

L'export n'avait qu'une sortie : le dossier des téléchargements. Sur un téléphone, c'est précisément l'endroit où le fichier devient difficile à retrouver, et impossible à donner à l'ordinateur d'à côté sans le faire passer par un service.

- **« Envoyer vers… », à côté d'« Exporter mes données »** : le même fichier, remis à la feuille de partage du système : AirDrop, Partage à proximité, une messagerie. Ni le format ni le contenu ne changent, c'est le même export par l'autre porte. Le bouton dit ce qu'il fait au-dessus de lui, comme ses voisins : on décide avant de cliquer, pas une fois la feuille ouverte.
- **Il n'apparaît que là où la feuille accepte un `.json`.** La disponibilité se demande à `navigator.canShare({ files })`, sondé au rendu avec un fichier vide de mêmes nom et type, et non à la présence de l'API : les navigateurs filtrent les types partageables, et `application/json` n'est pas sur toutes les listes blanches. Ailleurs, le bloc est exactement celui d'avant, sans bouton mort.
- **L'appel part dans la tâche du clic**, sans rien attendre avant lui : la feuille exige une activation transitoire, et un `await` glissé au-dessus la consomme. Safari iOS lève alors `NotAllowedError`, lui seul, ce qui rend la panne indétectable partout ailleurs. Un test la tient.
- **Fermer la feuille ne compte pas comme un export.** L'`AbortError` qu'elle rejette alors n'est pas une erreur : aucun message, et surtout aucune date d'export écrite. Le rappel des trente jours ne doit pas s'endormir sur un fichier qui n'est parti nulle part.
- **Tout autre échec retombe sur le téléchargement**, et le dit. On ne repart jamais de ce bouton les mains vides, et la date d'export ne s'écrit qu'une fois, jamais deux pour un envoi qui a fini sur le disque.
- **Les chemins de panique n'y touchent pas.** Le bandeau d'échec d'écriture et l'écran de secours restent sur le téléchargement, qui ne demande ni cible ni second geste : le partage est un confort des réglages, pas un recours.

### Ajouté — le thème dit clair ou sombre, la palette dit avec quelles couleurs

**Migration de schéma : v6 → v7.** Un champ `settings.palette` s'ajoute, avec « classique » pour tout document qui n'en portait pas. Rien d'autre ne bouge : les teintes enregistrées sur une catégorie ou un membre sont des noms de tokens, donc elles suivent la palette sans être réécrites.

L'apparence n'avait qu'un réglage. Elle en a deux, qui se combinent : le thème dit clair, sombre ou système ; la palette dit avec quelles couleurs. Chacune des six existe dans les deux thèmes.

- **Six palettes** : Classique (les couleurs d'origine), Monochrome, Douce, Vive, Neutre, Contrastée. Aucun composant n'a changé : une palette n'est qu'un jeu de surcharges de la couche de tokens, et `tokens.css` *est* la palette Classique, qui n'a donc rien à surcharger et ne peut pas dériver. Son bloc s'y déclare sur `:root, [data-palette='classique']` : sans le second sélecteur, elle n'existe que sur `<html>`, et un sous-arbre qui la force — l'aperçu des réglages — héritait les couleurs de la palette en cours au lieu des siennes.
- **Une vue « Apparence »** sous `/reglages`, avec un aperçu par palette. Le thème y descend avec elle : l'argument qui le gardait sur la page d'entrée — trois positions ne méritent pas un écran — valait tant qu'il était seul, et six aperçus ne tiennent pas dans une rangée. La page d'entrée ne perd pas une rangée, elle en change : « Apparence » y dit sa valeur, « Système · Douce ».
- **Le choix se garde comme le thème** : dans le document, avec un miroir en `localStorage` que le script d'`index.html` lit avant le premier rendu. Sans lui, l'app s'afficherait une frame dans les couleurs d'une autre palette.

### Corrigé — le bouton flottant volait les appuis d'un coin entier de l'écran

- **Une colonne invisible de 168 × 216 pixels**, posée au coin bas droit de tous les écrans sous 1024px : le cadre du bouton de saisie rapide, qui garde les trois portes montées même repliées pour pouvoir les animer. Sans fond ni bordure, il ne se voyait pas ; comme cible, il prenait tout. Les deux rangées du bas des récurrences — « Avances » et « Crédits et dettes » — y perdaient leur moitié droite, chevron compris, là où le doigt vise une rangée qui promet une navigation. Mesuré : dans le foyer d'exemple, quatorze cibles volées sur seize écrans, dont les trois boutons de saisie du calendrier, trois rangées des réglages et sept liens d'« À propos ».
- **Le cadre laisse passer, chaque cible reprend l'appui pour elle** : le motif que `Toaster` tenait déjà. Ce qui tombe entre deux portes va donc au calque, qui referme : un appui à côté fait ce qu'il doit faire. Repliées, les portes ne reprennent rien non plus : `inert` est une garantie d'accessibilité, pas de géométrie.

### Corrigé — l'anneau de focus ne se voyait pas sur le fond sombre

- **Mesuré à 1,61:1**, là où WCAG 1.4.11 en demande 3 d'un indicateur de focus : le violet des sorties sur le sapin du fond de page. Le défaut est antérieur aux palettes, qui n'ont fait que le rendre visible : l'anneau a désormais son propre token, et le thème sombre le repointe sur un violet plus clair (3,56:1 sur le fond, 9,17 sur une surface). **Le thème clair ne change pas.**
- **Le plancher de contraste est tenu par un test**, et non plus par la relecture : les douze couples palette × thème y sont mesurés. Quinze paires de texte à 4,5:1, le focus et l'écart entrées/sorties à 3:1, et la distance entre deux teintes de catégorie. Les écarts assumés y sont déclarés un par un, avec leur plancher propre.
- **La barre système suit la palette.** Ses deux balises figeaient les couleurs de Classique ; il n'y en a plus qu'une, tenue à jour depuis la feuille de style.

### Modifié — le calendrier dit enfin ce que ses pastilles veulent dire

La grille montrait quatre signes et n'en nommait aucun : une pastille pleine, une pastille en pointillés, un quantième dans un contour, un « +4 ». La couleur d'une pastille dit une catégorie, un contour en pointillés dit « prévue, pas encore confirmée », deux règles que le reste de l'app applique partout, et que le calendrier était le seul écran à ne jamais énoncer. Il n'y avait rien à comprendre : il fallait le savoir.

- **Une légende sous la grille**, séparée d'un filet : pastille pleine « Confirmée », pastille en pointillés « Prévue », quantième dans son contour « Aujourd'hui », et dessous la phrase qui dit ce que la couleur fait. Les pastilles d'exemple sont grises, volontairement : la légende montre la **forme**, jamais la couleur ; en désigner une sur les quarante-sept catégories du jeu d'exemple reviendrait à en nommer une au hasard. Les catégories, elles, se lisent dans la feuille du jour, où chaque ligne porte son nom à côté de sa pastille.

  Elle n'explique que ce qui est à l'écran : rien du tout sur une fenêtre sans aucune échéance, pas de cadre du jour sur un mois qui ne le montre pas, pas de phrase sur le « + » quand aucune case ne déborde. Une légende qui nomme des marques absentes est du bruit.

- **Le pointillé se dit aussi en mots.** Une case annonçait « 3 échéances » là où l'œil voit deux pastilles pleines et une en pointillés : son nom accessible dit maintenant « dont 1 prévue », dans le vocabulaire exact de la légende. Le design system §8 demande qu'une forme ne porte jamais seule ce qu'elle dit ; la règle valait pour le compte, le cadre du jour et le débord, et laissait justement passer le seul signe que personne ne devine.

- **« Aujourd'hui » est retiré de la carte.** Il n'apparaissait pas quand on était parti. Il apparaissait quand l'**ancre du clavier** avait quitté le jour, ce qui n'est pas la même chose : l'ancre suit la dernière case touchée, et rien à l'écran ne la montre. Sur le mois courant, ouvrir puis refermer un jour le faisait donc surgir sans que rien n'ait bougé, et l'appuyer ne rouvrait qu'une feuille sur une grille où l'on était déjà : un bouton dont la condition d'apparition est invisible **et** dont l'effet ne se voit pas.

  Ce qu'il promettait existe ailleurs, et se voit : « ce mois-ci » dans le bandeau ramène le mois la seule fois où l'on est vraiment parti, et le jour se rejoint d'un doigt sur sa case, que son cadre désigne, et que la légende nomme désormais. Le design system §6 est amendé : la condition d'apparition d'un repère d'action doit se voir à l'écran, et son effet aussi.

- **Le bas de page dégage le bouton flottant**, sur tous les écrans. Le cadre bas valait 96px quand le disque en occupe 129 depuis le bas de la fenêtre, barre d'onglets, gouttière et ses 56px de diamètre : les trente derniers pixels de chaque écran vivaient sous lui, à droite. Cela ne se voyait pas tant qu'un écran finissait par une tuile ou un bouton centré ; la légende, qui est du texte filant jusqu'au bord droit, y perdait sa dernière ligne à 390px de large. La mesure suit maintenant les tokens du bouton, pour ne pas se décaler le jour où il bouge.

### Modifié — l'historique répond à trois questions, et non plus à quatre cartes

**La page donnait le même poids à tout.** Recherche, douze derniers mois, écart entre deux mois, cumul de deux années : quatre grandes tuiles empilées, quatre cadres identiques, et rien qui dise laquelle répond à quoi. Prises une par une elles étaient justes ; ensemble, elles faisaient plusieurs écrans de défilement pour trois questions qui tiennent en une phrase : comment ça évolue, qu'est-ce qui a changé, où est cette ligne.

Trois défauts, tous mesurés :

- **La recherche coûtait cent quatre-vingt-dix pixels pour un champ** : un cadre de tuile, une étiquette de tuile, un libellé de champ, le champ, une phrase d'aide. Quatre lignes de chrome en tête de l'écran, dont trois disaient ce que la quatrième dit déjà, et la réponse repoussée sous le pli.
- **L'écart mensuel affichait toutes les catégories, zéros compris.** Sur le catalogue par défaut, quinze lignes à « 0,00 € · 0 % » pour deux vraies variations : la tuile la plus haute de l'écran pour la lecture la moins dense.
- **Le cumul annuel comparait une année en cours à une année finie.** Il lisait décembre pour les deux séries, donc huit mois contre douze, et annonçait comme un écart ce qui n'était qu'un mois de plus.

Ce qui change :

- **Un champ nu, et rien autour tant qu'on n'a rien demandé.** La recherche quitte sa tuile, comme le filtre du catalogue l'a déjà fait : **190 px → 44 px au repos**. La surface n'apparaît qu'avec les résultats, et ils arrivent juste sous le doigt plutôt que sous deux graphiques. Le libellé et l'aide ne disparaissent pas. Ils restent le nom accessible du champ et sa description, et l'aide se montre à l'œil là où elle sert : quand la recherche ne rend rien.

- **« Évolution », et un mois qui a le rang d'un sujet.** L'étiquette nomme ce que la tuile montre, la fenêtre se dit à côté sur la même ligne. Le mois lu passe de la lettre d'un micro-libellé mono à celle du corps : deux étiquettes empilées, c'était ça, « une succession de labels indépendants ». Entrées, Sorties et Solde gardent leurs pastilles — elles *sont* la légende du tracé — passent à la taille d'un montant de ligne, et le solde prend sa propre rangée sous un filet : il n'est pas un troisième flux, il est ce que les deux premiers donnent. Trois colonnes reviennent dès qu'il y a la largeur.

- **Une seule tuile « Comparer », et une bascule.** Mois ou Années, jamais les deux à la fois, sur le même composant que le sélecteur de thème. Une carte de moins, et le couple de mois survit à l'aller-retour.

- **Ce qui a bougé d'abord, le reste replié.** Un compte et l'écart net en tête — « 10 catégories ont changé · +84,70 € » —, puis les seules lignes qui ont bougé, de la plus grosse à la plus petite. Les inchangées passent derrière un repli qui ne les cache pas : il change ce qu'on lit d'elles. Une catégorie qui n'a pas bougé n'a rien à dire d'un écart, mais elle a quelque chose à dire de ce qu'elle coûte, et c'est **le montant commun aux deux mois** qui s'y affiche. Deux mois identiques donnent une phrase, plus une liste de zéros.

- **Un pourcentage qui n'existe pas se dit avec un mot.** Le mois de référence à zéro rendait un cadratin — « on ne sait pas » — alors qu'on sait très bien : la catégorie apparaît. Elle est « nouvelle ». Jamais d'`Infinity`, jamais de `NaN` : la proportion est nulle en amont, pas rattrapée à l'affichage.

- **Le rouge n'a pas changé de sens.** Il ne tombe que sur une hausse de charge ou de crédit — trois cents euros de plus sur un livret ne sont pas une facture qui flambe —, et il n'est jamais seul à parler : le signe est écrit, et la lecture accessible le prononce.

- **Deux années se lisent au même mois.** Le résumé et l'écart s'arrêtent au dernier mois que l'année choisie sait chiffrer, et l'écran le nomme : « 2026 s'arrête à août : les deux années se lisent à ce mois-là. » La comparaison est explicite au lieu d'être devinée — « 2026 contre 2025 » à côté du sélecteur —, et l'écart entre les deux courbes entre dans la lecture qui existait déjà, plutôt que dans un second bloc qui aurait réécrit les mêmes deux nombres.

- **Une légende sans trait ne s'affiche plus.** L'année d'avant se jugeait sur le document entier pendant que le tracé lisait la portée courante : sous un filtre par membre, une ligne de légende apparaissait pour une courbe qui n'existait pas.

- **Deux sélecteurs de la même largeur, qui se superposent sous 360px.** Le seuil est mesuré : une demi-tuile y laisse 65px de texte au contrôle quand « sept. 2026 » en demande 70, et un `<select>` fermé tronque sans le dire.

### Corrigé — l'historique tombait sur un document sans le moindre mois

La comparaison mensuelle calculait son mois de repli avant le garde qui explique qu'il n'y a rien à comparer, et l'arithmétique sur un mois vide lève. Le garde passe devant. Dans la foulée, un couple de mois qui ne désigne plus rien — après un import ou un chargement du jeu d'exemple — retombe sur les deux derniers au lieu de laisser un sélecteur afficher une valeur absente de sa propre liste.


### Modifié — les réglages deviennent une section, et redeviennent lisibles

**La page portait toute la gestion de l'app.** Les personnes, le catalogue entier des catégories, le thème, la devise, le stockage, l'export, l'import, le schéma de données, le jeu d'exemple, l'effacement total et « à propos », avec trois formulaires ouverts en permanence, qu'on ait ou non l'intention de créer quoi que ce soit. **3 725 px de haut à 390 px de large**, jeu d'exemple chargé : changer de thème demandait de traverser quarante-sept catégories.

Le défaut n'était pas graphique. C'était l'architecture de l'information : consulter, naviguer, créer et modifier vivaient au même endroit, sous le même cadre et au même poids visuel. Une console d'administration, pas une page de réglages qu'on ouvre à une main.

- **Une entrée, et huit vues.** La page fait maintenant **952 px** : cinq groupes, sept rangées, et chacune dit sa valeur, « Maison · 2 membres », « 47 catégories · 12 familles », « EUR · € ». On voit, on choisit, on modifie, au lieu d'ouvrir, faire défiler, chercher, modifier. Ce qui est complexe est descendu d'un cran : `/reglages/personnes` et la fiche d'un membre, `/reglages/categories` et la vue d'une famille, les deux formulaires de création, `/reglages/stockage`, `/reglages/donnees`.

  Des URL, et non un état de composant : c'est ce qui rend le retour du navigateur, le partage d'un lien et le bouton « retour » de l'écran identiques à ceux du reste de l'app. « À propos » n'a pas été dupliquée : elle existait déjà à la racine, la rangée y mène.

- **Le catalogue se parcourt au lieu de se déplier.** Douze familles, une ligne chacune avec son compte ; toucher l'une d'elles ouvre ses catégories. Le « tout déplier » disparaît avec ce qu'il servait à ouvrir : cinquante-sept lignes d'un coup. La recherche, elle, reste, et traverse les deux niveaux : « carbu » rend *Carburant*, sous *Transport*, et mène à la famille sans qu'on ait eu à deviner laquelle c'était.

- **La création se demande.** « Nom de la famille / Nature / Ajouter » et « Libellé / Famille / Ajouter » attendaient ouverts au bas de la liste pour un geste qu'on fait une fois par an. Ils ouvrent maintenant leur vue, comme toutes les saisies de l'app, et celle d'une catégorie ne redemande plus dans quelle famille ranger, puisqu'on vient de l'ouvrir. Une famille créée s'ouvre aussitôt : on en crée une pour y ranger quelque chose.

- **Consulter n'est plus modifier.** La liste des personnes portait un champ de saisie et une croix par membre. Elle porte des lignes, avec le revenu et la part de chacun ; le prénom se change sur la fiche, et le retrait — le geste qui touche le plus d'endroits à la fois — y vit à part, sous la phrase qui dit ce qu'il emporte.

- **« Tout effacer » sort de la file des outils.** Il s'y lisait comme « Copier le schéma ». Il a maintenant sa zone, en bas de la vue des données, avec son titre et sa conséquence écrite, et les outils qui restent sont groupés par intention : sauvegarde, restauration, format, exemple. Les trois questions d'avant l'effacement, elles, n'ont pas bougé.

- **Le bouton flottant se retire des vues des réglages.** Il pose la saisie d'une dépense ; « Ajouter un membre » pose un membre. Deux actions principales à trois centimètres l'une de l'autre ne disent plus laquelle est celle de l'écran. Il reste sur la page d'entrée, qui est une destination de la barre d'onglets, laquelle garde « Réglages » allumé partout dans la section, y compris sur « à propos ».

- **Moins de phrases, et les bonnes.** Le thème ne se commente plus : « Clair · Sombre · Système » se lit sur la bascule. Ce qui explique une conséquence reste, à l'endroit où elle se décide : « Remplace intégralement les données actuelles » au-dessus de l'import, « Rien n'est converti : seul le symbole change » sous la devise, et la prose sur ce que le navigateur promet est descendue dans la vue qui en parle.

Rien n'a changé du modèle ni des gestes : mêmes actions, mêmes confirmations, mêmes messages, même design system. Deux primitives de vingt lignes ont été ajoutées — un groupe et une rangée, au-dessus de `Tile` et d'`Eyebrow` —, et la tuile redevient ce que le DS §6 en dit : un groupe logique, dont la hiérarchie intérieure se fait en filets et en lettres plutôt qu'en cartes empilées.

### Modifié — la feuille du jour dit ce qu'elle fait, et se referme au doigt

Trois reproches sur le même écran, et une seule cause : **la feuille promettait des gestes qu'elle n'implémentait pas.**

- **« Dépense », « Revenu » et « Épargne » ne se lisaient pas comme des actions.** Trois pilules grises de largeur égale au bas d'un panneau ont la forme exacte d'un `Segmented`, que l'app pose partout ailleurs : elles disaient trois natures, pas trois gestes. Le verbe se dit maintenant une fois, au-dessus d'eux, et chaque bouton le reprend dans son nom accessible, pour qui n'a pas la légende sous les yeux.

  Le « + » ne peut toujours pas revenir, et la mesure est plus dure qu'on ne l'avait écrite : le pied de feuille partage 280px en trois, moins deux gouttières, soit **88px par bouton** à 320px de fenêtre, et non 93. En taille `md` il ne restait que 48px de texte pour « Dépense », qui en demande 52 : la rangée débordait déjà, sans aucun glyphe. La densité `sm` rend douze pixels par bouton sans toucher aux 44px de haut du plancher tactile, là où un glyphe en réclamerait vingt-quatre de plus. « Dépense » mène désormais la rangée, comme sur l'état vide du même écran et sur les portes du bouton flottant.

- **La poignée mentait.** Une pilule centrée au bord haut d'une feuille montante ne dit qu'une chose, et c'est « tire-moi ». Elle était partout et ne faisait rien. On peut maintenant tirer une feuille de **lecture** vers le bas pour la refermer, et la poignée n'apparaît plus que là où le geste existe.

  Le geste vit sur la poignée et l'en-tête, pas sur le corps : celui-ci défile, et `touch-action` ne peut pas servir un défilement et un glissement sur le même élément. Son seuil est de **96px, ou un lancer** : la hauteur de la prise, comme les deux autres gestes de l'app valent la hauteur de ce qu'ils déplacent. Jamais un pourcentage : une feuille d'un jour vide fait trois cents pixels et une feuille pleine sept cents, et le même geste y voudrait dire deux choses.

  **Les confirmations ne le prennent pas.** Une question a deux sorties, toutes deux nommées ; une troisième, au doigt et sans mot, jetterait sans rien dire des confirmations délibérées : l'escalier se redescend à zéro, donc un balayage égaré au troisième pas fait tout recommencer. Elles perdent au passage une poignée qu'elles n'auraient jamais dû porter.

- **Rien ne bougeait.** Les feuilles apparaissaient et disparaissaient d'un coup. Elles montent maintenant du bord bas en 240ms sous 640px, et se posent en fondu au-delà, où elles sont des boîtes centrées ; le fond suit. Et l'état **pressé** que le design system exige depuis toujours sur ce qu'on peut actionner existe enfin : quarante-deux cases de calendrier, les lignes de liste et les boutons ne répondaient rien du tout à un écran sans curseur.

  Le contenu, lui, n'arrive pas en escalier : la montée de la feuille *est* le mouvement, et douze lignes qui s'égrènent par-dessus sont deux mouvements qui se disputent les mêmes 240ms.

Tout reste neutralisé sous `prefers-reduced-motion`, sauf le glissement, qui n'est pas une animation : c'est le doigt qui le conduit. Aucune dépendance ajoutée, et le `<dialog>` natif n'est pas touché, donc le piège de focus, Échap, le clic sur le fond et le retour du focus restent ceux du navigateur.

### Modifié — le mot « foyer » quitte l'app

« Foyer » supposait une chose que le calcul n'utilise jamais : la cohabitation. Rien dans `domain/split.ts` ne dépend du fait que les personnes vivent ensemble : le prorata marche à l'identique pour un couple à deux adresses, deux colocataires, ou quelqu'un qui partage un abonnement avec sa sœur. Le mot laissait pourtant dehors qui vit seul, qui vit chez ses parents, et qui partage à distance. Il faisait en plus trois métiers à la fois — le conteneur, la portée de partage, les personnes —, ce qui interdisait de le remplacer par un seul mot.

- **La portée de partage dit « en commun ».** C'est le mot que l'app avait déjà pour son filtre. Le cahier §4.6 signalait la collision sans la corriger : « Tout le monde » et « Tout le foyer » ont porté la même étiquette à un écran d'écart en voulant dire le contraire. La saisie, les en-têtes de groupe et le sélecteur de personne s'alignent sur le filtre, et la collision tombe.
- **Les personnes sont des personnes.** « Qui vit ici ? » devient « Avec qui tu partages des dépenses ? » , la question porte sur ce dont le calcul se sert. La section des réglages s'appelle « Personnes ».
- **Le nom du foyer ne se demande plus.** Il ouvrait l'onboarding et il était la seule réponse *exigée* de toute l'app, pour un libellé de colonne latérale. Il vit dans les réglages, facultatif, sous « Nom affiché » ; vide, la ligne ne s'affiche pas, et la colonne garde le nom de l'app qu'elle porte déjà au-dessus. **Le premier lancement passe donc de trois étapes à deux, et aucune n'exige de réponse.**
- **La ligne du logement ne dit plus « Loyer » tout court.** Voir ce mot comme l'une des deux seules lignes proposées disait « cette app n'est pas pour toi » à qui n'en paie pas. Elle nomme le loyer, le crédit immobilier et ce qu'on verse pour se loger, et dit qu'on peut la laisser vide, ce qu'elle était déjà sans le dire.
- **Le solo cesse d'être une dérogation.** « Le foyer fonctionne très bien en solo » concédait que ça marche quand même ; les formulations disent maintenant ce qui se passe, sans s'excuser.

Aucun changement de modèle, donc **aucune migration** : `Household.name` reste une chaîne, simplement facultative. Un document existant garde son nom et l'affiche. Le `name` du manifeste PWA est le seul endroit qui garde le mot : il porte l'identité des installations déjà en place ; l'écart est assumé et inscrit dans l'architecture.

### Modifié — le calendrier devient un calendrier

Il en avait la forme et rien d'autre. Sa grille ne calculait que les cases d'avant le 1er, jamais celles d'après le dernier jour : elle faisait cinq ou six rangées selon le mois, et la tuile changeait donc de hauteur sous le pouce à chaque balayage. Aucune touche n'y déplaçait le jour. Et le jour choisi peignait sa case entière en lime, alors que `--cat-1` **est** le lime : la pastille d'une catégorie 1 disparaissait purement sur le jour qu'on venait d'ouvrir.

- **Une fenêtre de six semaines, toujours.** Quarante-deux cases, les jours des mois voisins compris, avec leurs échéances. La tuile ne bouge plus d'un mois à l'autre, et le loyer qui tombe le 1er du mois suivant se voit depuis celui-ci. Un jour voisin mène à son mois, comme un chevron. Il montre ce qui est déjà écrit et rien de plus : ouvrir un mois grave toutes ses échéances prévues dans le document, et une lecture n'écrit pas douze lignes en passant ; toucher la case est justement le geste qui l'ouvre.
- **La logique quitte le rendu.** `features/calendar/grid.ts` ne connaît ni React ni le DOM et ne construit jamais de `Date` : il découpe le mois, déplace le focus d'une touche, décide combien de pastilles tiennent et ordonne les échéances d'un jour. Son test vérifie qu'un février fait quarante-deux cases sans monter de navigateur, et le calendrier avait, jusqu'ici, zéro test.
- **Le clavier, enfin.** Un seul arrêt de tabulation pour quarante-deux cases, les flèches déplacent le jour, Origine et Fin mènent aux bords de la semaine, Page précédente et suivante changent de mois. La grille consomme la frappe, faute de quoi une flèche déplacerait le jour *et* changerait le mois, à deux étages : c'est le contrat que le curseur des graphiques posait déjà.
- **Deux formes, jamais deux teintes.** Aujourd'hui porte son quantième dans un contour, le jour ouvert dans une pilule pleine. Les pastilles restent sur la surface de la tuile quoi qu'il arrive, ce qui supprime le lime sur lime au lieu de le rattraper. Et le nom accessible d'une case dit tout en mots : le jour de la semaine, le compte, « aujourd'hui », « hors du mois affiché ».
- **Les pastilles ne sont plus tirées au hasard.** Elles suivaient l'ordre d'insertion du document : un loyer pouvait tomber dans le « +3 » derrière trois cafés. Confirmé avant prévu, puis du plus gros au plus petit, et la feuille du jour se lit dans l'ordre exact des pastilles de sa case.
- **Le jour s'ouvre en feuille**, avec le total de la journée, son compte d'échéances et ses trois portes de saisie. Il était une tuile posée sous la grille, qui devait réécrire à la main ce qu'un `<dialog>` donne : Échap, le clic à côté, le piège de focus, le retour du focus à la case d'origine.
- **La lecture courte et refermable rejoint la question fermée** parmi ce qui a droit à la feuille : le design system §6 est amendé de cette décision. La carte a un temps porté un « Aujourd'hui » en plus du « ce mois-ci » du bandeau ; il est reparti avant d'être publié, et la section « le calendrier dit enfin ce que ses pastilles veulent dire » raconte pourquoi.

### Modifié — la répartition se lit d'un trait, comme la page qui la présente

La présentation montre le partage dans une seule carte qu'on lit sans lever les yeux : les parts sous un même filet, et la vérification qui la ferme. L'écran disait la même chose, éclaté en une tuile par personne, avec la ligne qui prouve que la somme des parts vaut le total reléguée après deux sections repliables, à deux écrans de défilement des chiffres qu'elle vérifie. Il fallait en retenir deux pour constater qu'ils tombent, c'est-à-dire croire l'écran sur parole. Un partage entre deux personnes ne se croit pas sur parole : c'est toute la raison d'être de cette page.

- **Une seule carte pour tout le monde, vérification comprise.** Les parts deviennent les lignes d'une même liste, et « Total des parts » la referme, contre les chiffres qu'il additionne.
- **Le versement passe après le calcul qui le produit.** L'ordre était inverse : « À verser » en tête, puis les raisons en dessous, en plus petit. On lit désormais qui, ce qu'il gagne, ce que le mois lui coûte, ce que le mois précédent rattrape, et enfin ce qu'il verse.
- **Le revenu redevient une ligne comme les autres.** Il s'écrivait « Revenu 2 890 € » d'un seul tenant, collé en bas de tuile ; il s'aligne maintenant à droite avec les autres montants, où l'œil les compare.
- **« Sa part du mois » cesse d'être arrondie à l'euro.** C'est le premier terme d'une soustraction qu'on lit juste en dessous, et arrondie elle ne tombait plus juste : « 1 963 € + 176,44 € » ne fait pas 2 138,99 €. Ces lignes-là n'existent que pour être vérifiables.
- **Les parts forment enfin une liste** pour un lecteur d'écran, là où c'était une pile de sections sans nom : « liste, 2 éléments », puis chaque part lue d'un trait.

Ce que le mois affiche ne change pas d'un centime : les parts, le prorata et les reports sont calculés comme avant.

### Ajouté — le premier geste après les deux questions

Les deux questions du premier lancement étaient irréprochables. Le trou était juste après : on cliquait « Commencer » et on arrivait sur un tableau de bord entièrement à zéro, dont le seul viatique était « Ce mois est encore vide, ajoute une dépense ». Or l'app ne vaut rien tant que les récurrences ne sont pas posées — c'est toute sa thèse, et la première phrase de la présentation le dit — et rien, à aucun moment, n'y conduisait. Une dépense ponctuelle n'amorce aucune prévision.

- **Une troisième étape, facultative : « Ce qui revient chaque mois ».** Un montant de salaire par personne, un montant de loyer. Chaque montant saisi pose une récurrence mensuelle ; un champ vide ne pose rien, et « Je le ferai plus tard » est un bouton aussi visible que le principal. Le cahier §4.1 tient : rien n'y est exigé, et l'app reste utilisable sans elle. Mais « ne rien exiger » et « ne rien proposer » sont deux choses différentes.
- **Les deux lignes ne sont pas choisies au hasard.** Le revenu d'une personne ne se déclare nulle part : il se lit sur ses récurrences de ressources. Un salaire par membre est donc le seul chiffre qui fasse parler le prorata, et le loyer la première charge qui rende le partage lisible. Le mois s'ouvre ensuite avec ses échéances **à confirmer**, jamais confirmées d'office : l'app ne sait pas si le loyer de ce mois-ci a déjà été payé.
- **Le jour ne se demande pas.** Un champ de plus par ligne aurait fait de cette étape le questionnaire de configuration que le cahier refuse. Les récurrences sont posées au 1er, mensuelles, et l'étape le dit, parce qu'une valeur choisie à la place de quelqu'un et jamais annoncée se découvre au premier mois faux.
- **L'aperçu de la troisième étape calcule le prorata au lieu de le promettre.** À deux revenus et un loyer, la part de chacun s'affiche, avec la fonction du domaine qui la calcule sur tous les autres écrans. C'est le meilleur argument du produit, montré à l'instant où l'on décide de s'en servir.
- **`MembersStep` dit enfin où se posent les revenus.** L'aperçu promettait « une fois leurs revenus posés, les charges communes se partagent au prorata » sans dire *où* : quelqu'un qui ajoutait deux prénoms en attendant deux champs de salaire ne trouvait rien, et le prorata restait muet sans qu'il sache pourquoi.
- **L'état vide du mois mène au bon geste.** Tant qu'aucune récurrence n'existe, il propose d'abord d'en poser une. Dès qu'il en existe une, le mois vide redevient un mois ordinaire et les deux portes de saisie reprennent leur rang : il n'insiste pas sur un geste déjà fait.
- **L'export est nommé à la dernière étape**, sous la promesse de confidentialité. La contrepartie du local-first ne se découvrait qu'au bout de trente jours, par un bandeau ; elle coûtait une ligne au moment où la promesse est faite.

Le premier chargement passe de 195,4 à 196,7 Kio : les questions du premier lancement ne sont pas chargées à la demande, et ne peuvent pas l'être. Elles sont le premier écran. Il reste 3,3 Kio de marge sous le budget.

### Ajouté — la présentation montre le calcul, et répond aux objections

La page d'arrivée démontrait un seul écran : le mois. Ce qui distingue vraiment l'app — la répartition au prorata, la régularisation du mois suivant, la cascade de la capacité d'épargne — n'y existait qu'en prose, juste au-dessus de la grille qui ne le montrait pas. C'est le meilleur argument du produit, et il était raconté au lieu d'être montré.

- **« Le calcul, en entier »** pose deux tuiles sous les principes, avec les composants et le vocabulaire des vrais écrans : le pot commun découpé au prorata des revenus, le report du mois précédent qui rattrape ce qu'une seule personne a avancé, la ligne « Total des parts » posée à côté du total des charges — égale au centime, report compris —, et la cascade `revenus − charges − crédits` qui produit la capacité d'épargne. Aucune capture : le DS §1 interdit l'illustration, une page qui présente l'app doit *être* l'app.
- **Les chiffres du foyer d'exemple se recomposent d'un bout à l'autre de la page**, et un test le tient désormais. Montrer un calcul dont les termes ne retombent pas sur leurs pieds démentirait à l'écran ce que la page promet.
- **Le modèle économique est énoncé**, sous la promesse de confidentialité : gratuit, sans publicité, sans revente. Rien à vendre puisque rien n'est collecté, rien à financer puisqu'il n'y a pas de serveur. Le raisonnement était écrit dans le README et n'avait jamais atteint la page qui en a besoin.
- **Quatre questions, et leurs réponses en clair** : et si je change de téléphone, et si je vide mon navigateur, c'est gratuit donc où est le piège, qui es-tu. Les deux premières tenaient en une demi-phrase dans le bandeau d'installation, les deux autres n'étaient nulle part. Ouvertes plutôt que repliées : quelqu'un de méfiant n'a pas à cliquer pour obtenir la réponse qui lèverait sa méfiance. La gratuité se répond désormais par l'AGPL : ce qui part d'ici reste ouvert, et ça se vérifie au lieu de se promettre.
- **Le cahier des charges et le design system sont atteignables depuis la présentation.** Ils ne l'étaient que depuis « à propos », pas depuis la page que voit un visiteur qui ne crée aucun foyer, et qui est souvent la seule qu'il verra.
- **« Juste voir à quoi ça ressemble ? »** s'affiche enfin sous les deux boutons d'arrivée. La phrase était écrite depuis le début et branchée nulle part, si bien que « Charger l'exemple » disait le geste sans dire pourquoi le faire.

Le premier chargement **baisse** de 196,3 à 195,4 Kio malgré ces trois sections : la prose de la présentation quitte `i18n/fr.ts`, que tous les écrans importent, pour `i18n/landing.ts`, qui voyage avec la page. La règle que `i18n/legal.ts` appliquait déjà.

### Ajouté — le navigateur refuse maintenant ce que l'app ne faisait déjà pas

L'app ne demande rien à l'extérieur : aucun `fetch`, aucune ressource tierce, les fontes auto-hébergées. Rien ne l'attestait pourtant, et « rien ne sort de ton appareil » restait une phrase qu'il fallait croire sur parole, ou vérifier en relisant le code. Les réponses portent désormais une **CSP stricte** et trois en-têtes qui la complètent : la promesse devient une règle que le navigateur applique, et elle tiendrait même si une dépendance npm était compromise.

- **`Content-Security-Policy`** en `default-src 'self'`, avec `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'` et `form-action 'none'` ; ce dernier parce qu'un formulaire qui partirait par accident emporterait des montants dans une URL.
- **`X-Content-Type-Options: nosniff`**, **`Referrer-Policy: no-referrer`** et un **`Permissions-Policy`** qui refuse caméra, micro, géolocalisation, capteurs, paiement, partage et Topics. L'app n'en demande aucun.
- **Le hash `sha256` du script en ligne est calculé, jamais recopié.** `index.html` en contient un : le miroir `localStorage` du thème, qui évite une frame en clair au démarrage. Une empreinte écrite à la main serait fausse au premier caractère changé, et l'app partirait avec une page qui ne s'affiche pas. `npm run csp` la produit depuis le fichier réellement servi.
- **Un audit qui échoue avant le déploiement, pas après.** `npm run csp:check` — dans `npm run verify`, donc dans la CI — lit la politique telle qu'elle est écrite dans `vercel.json` et l'oppose à `dist/` : scripts en ligne, feuilles, `url()` du CSS, icônes du manifeste, précache du service worker, et les API que `Permissions-Policy` gouverne. Une police Google, une balise `<style>`, un `onclick=` ou un `preconnect` vers un tiers cassent la construction.

Deux concessions, que l'audit a trouvées et que le code seul ne montrait pas : `font-src` autorise `data:`, parce que Geist Mono embarque des sous-ensembles en base64, sans quoi toutes les fontes tombaient en repli système, partout, sans une erreur ; et `Permissions-Policy` laisse `clipboard-write=(self)`, sans quoi le bouton « copier le schéma » s'éteignait en silence.

### Modifié — un seul formulaire de saisie, plusieurs états initiaux

Décrire une dépense de ce matin et décrire un loyer mensuel sont le même geste à une case près, celle qui dit « ça se répète ». Il y en avait pourtant deux : un formulaire d'entrée, un formulaire de récurrence. Ils avaient donc divergé — ordre des champs, libellés, messages, champs présents d'un côté et absents de l'autre — et l'utilisateur pouvait deviner par quel bouton il était arrivé.

Il n'en reste qu'un, et les portes ne transmettent que des valeurs initiales : nature présélectionnée et rythme **Ponctuel** depuis « Ajouter une dépense / un revenu / une épargne », rythme **Récurrence** depuis l'onglet Récurrences. Rien n'y enferme non plus : arrivé par « Ajouter une récurrence » pour constater qu'il s'agit d'un achat unique, un doigt suffit.

- **Trois choix successifs** en tête : Dépense / Revenu / Épargne, Ponctuel / Récurrence, puis Montant fixe / Montant variable, ce dernier seulement en récurrence, où la question existe. Ensuite, les champs communs aux deux rythmes : montant, catégorie, libellé, membre, charge commune, note.
- **« Montant variable » devient atteignable depuis la saisie**, où il manquait : une facture d'électricité ou un salaire qui varie ne s'y saisissaient pas, bien que le modèle les porte depuis toujours.
- **Le champ « Note » manquait à toute la saisie**, ponctuelle comprise : la note se lit sur la ligne du mois, se cherche depuis l'historique et survivait à une reprise, mais aucun écran ne permettait d'en écrire une.
- **La première échéance ne dépend plus de la porte**, mais de la seule question qui compte : a-t-elle eu lieu ? Payée si elle est datée d'aujourd'hui ou d'avant et que le montant est fixe ; à confirmer si elle est à venir, ou si la règle est variable : la marquer payée l'enregistrerait à une supposition. L'écran le dit sous le champ de date, avant l'enregistrement.
- **Le titre est « Ajouter une opération »** à la création : nature et rythme se changent d'un doigt, et « Ajouter une récurrence » s'affichait déjà au-dessus d'un formulaire qu'un seul geste ramenait au ponctuel. C'est le bouton qui nomme ce qui va être créé : « Ajouter l'opération », « Ajouter la récurrence ». En reprise, plus rien ne bouge et le titre redevient précis.
- **Le jour du mois se préremplit depuis la première échéance** : « le 1er mars » répond déjà à « quel jour du mois ». Il reste modifiable.
- **Un seul jeu de mots.** « Donne un libellé à cette entrée » s'affichait sous un écran intitulé « Ajouter une récurrence » ; « les suivantes arrivent à confirmer chaque mois » était écrit en dur sous un champ qui propose aussi la semaine, le trimestre et l'année.

### Modifié — les portes de saisie deviennent un menu

Les trois boutons partageaient une largeur depuis peu, mais rien d'autre : leurs « + » tombaient où le libellé les laissait, la croix se cachait au coin sous la dernière porte, et le tout se posait sur la liste du mois sans qu'un pixel ne dise qu'on était devant une question plutôt que devant l'écran.

- **Une colonne à largeur fixe**, tenue dans la feuille de style. C'est elle qui permet aux `+` et aux libellés de tomber chacun sur un axe — `[icône] [texte]`, la colonne d'icône à 20px — et à la croix de se centrer sous la pile. Cette position-là dépend d'une largeur qu'un contenu variable ne donne qu'après coup.
- **Un voile à 12 %** (28 % en sombre, où le noir sur du sapin ne se voit pas) qui s'arrête au-dessus de la barre d'onglets : elle n'est pas ce qu'on lisait, c'est une sortie, et elle reste utilisable.
- **Une ouverture et une fermeture animées** : opacité, translation, échelle sur 160 ms, décalées de 30 ms par porte à l'arrivée et jamais au départ. Les portes restent montées pour pouvoir s'animer en partant ; repliées, `inert` et `aria-hidden` les retirent du parcours et des annonces.
- **`role="menu"`**, et donc le motif clavier qui va avec : flèches haut et bas avec bouclage, Origine et Fin. Un rôle qui promet un parcours doit le tenir.
- La marge sous la barre d'onglets vient d'un jeton `--nav-h` plutôt que d'une valeur recopiée : la barre occupe 56px plus son filet, et 16px la séparent du bouton.

### Corrigé — les trois portes de saisie étaient en escalier

Dépliées, **Dépense**, **Revenu** et **Épargne** étaient dimensionnées chacune sur son libellé et calées à droite : leur bord gauche faisait un escalier, et trois boutons qui ouvrent trois portes du même geste se lisaient comme trois objets empilés. Le pied de feuille modale égalisait déjà ses actions ; le bouton flottant est arrivé après, et personne n'avait reposé la question.

- **Les trois portes partagent une largeur** : celle de la plus large, que le groupe avait déjà. Le contenu de chaque bouton reste centré : le décaler demanderait de défaire le centrage du composant, et `cn` concatène les classes sans les fusionner, donc la classe ajoutée ne remplacerait pas l'autre.

### Ajouté — le mois dit enfin ce qu'il a mis de côté

Le solde du mois compte un versement d'épargne comme une sortie. C'est exact en trésorerie, et ça fait passer un mois où l'on a placé 300 € pour un mois où l'on a dépensé 300 € de plus. La tuile **Capacité d'épargne** savait déjà le rattraper, mais seulement sous un filtre par membre et seulement au-delà de 1024px : sur un téléphone, hors filtre, l'app ne le disait nulle part.

- **« 804,00 € versé » se lit avec ou sans filtre**, et à la largeur de sa tuile plutôt qu'à celle de l'écran. La condition valait pour le *reste à placer* : il appelle un geste, et le geste se fait sur un compte à la fois ; un constat s'additionne, et l'écran de l'épargne l'additionnait déjà.
- **Sur le mois entier**, comme la capacité et le reste à placer qui l'encadrent : les deux clauses sont les deux moitiés du chiffre et doivent le redonner. Trois montants voisins qui ne s'additionnent pas se lisent comme une erreur de calcul, et l'écran de l'épargne — qui compte le mois entier lui aussi — aurait annoncé un autre montant sous le même mot.
- **Une reprise se nomme.** Le mois où une avance est posée, le livret rend plus qu'il ne reçoit : la tuile lit « 510 € repris de l'épargne », jamais un montant négatif. Rien à dire, rien d'affiché.

### Modifié — la licence passe de MIT à AGPL-3.0

MIT autorisait explicitement ce que ce projet ne veut pas : reprendre le code, le refermer, et le vendre sans que personne ne revoie une ligne. Aucune licence open source n'interdit l'usage commercial — c'est un critère d'exclusion de la définition — donc le levier n'est pas l'interdiction, c'est le copyleft.

- **Le dépôt est désormais sous [GNU AGPL-3.0-or-later](LICENSE).** Reprendre, modifier, redistribuer et héberger restent libres, y compris commercialement ; toute version modifiée doit être publiée sous la même licence. L'article 13 étend l'obligation à la simple mise en ligne : mettre cette app modifiée sur un domaine, c'est en devoir la source, même sans rien distribuer.
- **La bascule ne vaut que pour la suite.** La version `1.0.0` et tout ce qui a été publié avant sont sortis sous MIT et le restent : quiconque en a obtenu une copie garde ces droits-là pour toujours. C'est l'AGPL qui couvre les versions à partir de celle-ci.
- **L'app le dit là où elle tourne**, et pas seulement dans un fichier à la racine : « à propos », les mentions légales, les conditions d'utilisation, le préambule des licences tierces servies avec l'app, et une notice en tête du JavaScript produit. L'article 13 demande que le programme offre sa source à qui s'en sert : un `LICENSE` que personne n'ouvre ne le fait pas.
- Les douze paquets embarqués (MIT, ISC, OFL 1.1) sont tous permissifs : aucun n'entre en conflit avec le copyleft, et leurs notices ne changent pas.

### Ajouté — ce que l'app doit dire d'elle-même

L'app était irréprochable techniquement et à découvert juridiquement. Ces pages ne changent rien à ce qu'elle fait ; elles rendent vérifiable ce qu'elle promet.

- **Licences des composants tiers**, produites depuis `node_modules` par `npm run licences` et servies avec l'app. Deux des douze paquets sont des fontes sous SIL Open Font License 1.1 — Archivo et Geist Mono —, qui demande d'être distribuée avec le logiciel de fonte : les `.woff2` partaient dans `dist/assets` sans qu'aucun texte de licence ne les accompagne. Le fichier est produit et jamais écrit à la main, et `npm run verify` échoue s'il a pris du retard.
- **Mentions légales** (`/mentions-legales`). L'article 1-1 de la LCEN — l'ancien 6 III, déplacé par la loi du 21 mai 2024 — impose à tout éditeur de se rendre identifiable, hébergeur compris.
- **Politique de confidentialité** (`/confidentialite`). L'app ne fait aucune requête ; l'hébergeur, lui, journalise des adresses IP, et c'est le seul traitement du projet. La page dit aussi **pourquoi il n'y a pas de bandeau cookies** — IndexedDB porte les données elles-mêmes, donc l'exemption du strictement nécessaire s'applique — plutôt que de laisser cette absence se lire comme un oubli.
- **Conditions d'utilisation** (`/conditions`). MIT couvre le code, pas le service : sa clause de non-garantie protège qui récupère le dépôt, pas qui ouvre le site.
- Les trois répondent avant la création du foyer comme après, et se chargent à la demande : leur prose ne pèse sur le premier chargement de personne.
- **Un lien vers le journal des modifications** depuis « à propos » : la version s'affichait sans dire ce qu'elle apporte, sur une app qui refuse par principe de se mettre à jour dans le dos de qui l'utilise.
- **Des données structurées** dans la page : une app gratuite, installable et sous licence ouverte se présentait comme n'importe quel lien.

### Ajouté — périodicités et devise

- **Toutes les *n* semaines, tous les *n* ans.** Le modèle portait un intervalle sur les trois unités depuis la v1 ; le formulaire n'en proposait un que sur les mois. La quinzaine — le rythme d'une paie sur deux — ne se saisissait pas.
- **La devise se règle** (Réglages). Le champ existait au modèle, validé, migré, exporté et lu par tous les montants de l'app, et atteint par aucun écran : il valait « EUR » à perpétuité sans que rien ne le dise. Ce n'est pas la multi-devise, qui reste hors v1, et l'écran le dit : seul le symbole change, rien n'est converti.
- **« Où part l'argent » s'ouvre.** Chaque part de la légende mène aux lignes du mois qu'elle compte, comme les deux tuiles de flux mènent depuis longtemps à la liste filtrée sur leur nature.
- **« Tout afficher » sur la recherche.** La coupe à vingt était annoncée mais sans issue : « précise la recherche » ne sert à rien quand tout ce qui dépasse porte réellement le même mot.

### Corrigé — ce que le formulaire ne montrait pas, il l'effaçait

- **Une périodicité que le formulaire ne savait pas décrire se faisait réécrire à la première reprise de sa fiche.** Un document importé portant « toutes les deux semaines » s'affichait juste, se développait juste, et revenait hebdomadaire dès qu'on rouvrait sa fiche pour en corriger le libellé : ses échéances à venir replanifiées au double, sans un mot. La règle du cahier §3 était bonne (un écran renvoie l'état complet de ce qu'il montre) ; c'est ce qu'il montrait qui ne l'était pas.
- **Une périodicité longue n'avait plus de prochaine échéance.** `nextOccurrence` regardait deux ans devant elle, en dur : une annuelle tous les trois ans rendait `null`, donc disparaissait de « Prochaines échéances » et se rangeait en fin de tri. L'horizon se déduit désormais de la période.
- **La note d'une entrée ne se relisait nulle part.** Il fallait rouvrir la ligne pour la voir, et rien n'annonçait qu'il y en avait une, alors qu'une fiche de récurrence affiche la sienne depuis toujours. Elle se lit désormais sur la liste du mois et dans les résultats de recherche.
- **« Le 31 de chaque mois » s'affichait sur une échéance qui tombe le 28.** Le jour est borné et jamais reporté, donc 31 *est* le dernier jour du mois : les écrans le nomment, et l'aide du champ dit le geste au lieu de le laisser deviner.
- **Le schéma donné à un assistant enseignait trois champs sans effet** (`Category.icon`, `MonthState.closed`, `settings.monthStartsOn`) comme s'ils réglaient quelque chose. Ils restent au modèle — deux d'entre eux sont ce qu'un chantier déjà envisagé redemanderait — mais le document les annonce désormais comme réservés.

---

Le chantier de la fiabilité du stockage. La promesse de l'app est que tout vit sur l'appareil ; rien n'instrumentait la frontière avec le navigateur, et quatre façons de tout perdre en silence coexistaient.

**Aucune migration de document** : `schemaVersion` reste à 6, et un export d'aujourd'hui se rouvre à l'identique. La base IndexedDB, elle, passe de la version 1 à la version 2 pour accueillir les sauvegardes locales, sans perte et sans rien transformer. Un onglet resté ouvert sur la version précédente doit être fermé pour que le passage se fasse ; l'app le dit désormais au lieu de tourner indéfiniment sur son écran de démarrage.

### Ajouté

- **Flush à la fermeture** : la file d'écriture est vidée sur `pagehide` et quand la page passe en arrière-plan : les deux seuls événements sur lesquels un téléphone rende la main.
- **Bandeau d'échec d'écriture**, persistant et non écartable, avec un export immédiat. Il s'affiche partout, y compris sur un écran de saisie : c'est précisément là qu'on est en train de perdre du travail.
- **Écran de récupération** sur la page d'arrivée quand le document stocké ne se lit pas : import, téléchargement de la copie brute, rechargement, puis effacement derrière deux confirmations.
- **Coordination entre onglets** par `BroadcastChannel` : l'onglet en retard annule son écriture en attente, relit, et le dit.
- **Persistance demandée au navigateur** (`navigator.storage.persist()`) à la création du foyer et après un import.
- **Réglages › Sur cet appareil** : l'engagement du navigateur, la place occupée, et les sauvegardes locales avec leur restauration.
- **Cinq sauvegardes locales tournantes**, une par jour de saisie, chacune portant l'état d'avant les modifications du jour.
- **Écran de secours** en cas d'exception au rendu, qui propose d'abord de récupérer les données, puis de réinstaller l'app.

### Corrigé

- Les écritures pouvaient **se recouvrir** : deux transactions ouvertes en parallèle sur la même clé commettent dans l'ordre du moteur, si bien que la dernière saisie pouvait être écrasée par l'avant-dernière.
- Un **échec d'écriture était avalé** : quota plein, navigation privée ou base évincée, on saisissait sans que rien ne s'enregistre ni ne le dise.
- Une **saisie faite dans les 400 ms** précédant la fermeture de l'onglet était perdue.
- Le message d'échec de lecture était **rédigé et jamais affiché**, et créer un foyer **écrasait alors le document illisible**, qu'une simple mise à jour de l'app aurait parfois suffi à rouvrir.
- Deux onglets ouverts **s'écrasaient mutuellement**, au dernier qui écrit.
- Une connexion coupée par le navigateur faisait **rejeter toutes les écritures suivantes** jusqu'au rechargement, sans un mot.
- Une ouverture de base bloquée laissait **l'écran de démarrage tourner sans fin**.
- Une exception au rendu donnait un **écran blanc**, reproduit à l'identique à chaque rechargement puisque le service worker resservait la même version.

### Corrigé — le foyer d'une seule personne

Aucune migration : `schemaVersion` reste à 6, rien ne change dans le document.

- **Le mois filtré sur le membre unique vaut désormais le mois du foyer, au centime.** Le prorata refusait de se calculer à moins de deux membres, et la vue filtrée retombait sur les seules lignes à son nom : le loyer, un salaire ou un versement laissés « tout le foyer » en disparaissaient, et le solde comme la capacité d'épargne divergeaient de l'écran d'à côté sans raison lisible. Un prorata à un seul participant n'est pas indéfini : il vaut 100 %, sans qu'aucun revenu soit déclaré. Il n'y a personne à comparer.
- **La tuile « Part du foyer » s'affiche aussi seul du foyer** : ses charges perso d'un côté, le pot entier de l'autre : précisément la distinction qui reste quand on est seul. La régularisation, elle, se calcule et rend zéro.
- **La pilule « Commun » se propose dès le premier membre** : le pot seul, à son montant plein, la seule lecture qui distingue encore les charges du foyer des siennes.
- **L'écran Répartition rend le pot en solo** — une ligne à 100 %, la liste vérifiable — au lieu d'exiger un second membre.

### Corrigé — l'épargne n'est pas une charge

Aucune migration : `schemaVersion` reste à 6. Les totaux, eux, ont toujours été justes : la tuile Charges, la capacité d'épargne et la répartition ont toujours exclu l'épargne. C'étaient les filtres des listes qui mentaient.

- **Les pilules des listes filtrent par nature, plus par sens.** Sur la liste du mois et sur les récurrences, « Charges » filtrait ce qui *sort* du compte : un versement d'épargne s'y rangeait, et une reprise se rangeait sous « Revenus ». Le sous-total du filtre contredisait alors la tuile Charges voisine, qui exclut l'épargne. « Charges » compte désormais comme la tuile — charges et crédits — et « Revenus » ne compte que les ressources.
- **L'épargne a sa pilule**, sur les deux listes : la même position que dans la saisie, et le seul endroit où isoler versements et reprises.
- **Le total en tête des récurrences suit le filtre** : sous « Charges » il laisse l'épargne dehors, sous « Épargne » il se compte en net — reprises déduites, comme partout — et chaque périmètre se dit sous le chiffre.
- **Cliquer la tuile Revenus ou Charges** filtre la liste sur la nature que la tuile compte, plus sur un sens qui montrait davantage.
- **Sous une pilule, les totaux parlent sa langue** : les charges en sortie pleine comme la tuile du même nom, les revenus en entrée, et l'épargne en net : versements moins reprises, comme partout. Le solde, signé par le sens, affichait « −300 € » sous la pilule Épargne d'un mois où l'on en plaçait 300, et les groupes des récurrences contredisaient au signe près le total posé juste au-dessus d'eux.
- **L'alerte de changement de prix se tait sur l'épargne** : verser plus sur un livret n'est pas une facture qui flambe : rouge et panneau ne valent que pour une charge qui monte ou un revenu qui baisse. Le changement se lit quand même, en « montant » plutôt qu'en « prix ».
- **Le comparatif de deux mois ne peint plus en rouge un mois où l'on épargne davantage** : l'écart d'un livret se lit sans alarme, le rouge reste aux charges et aux crédits qui montent.
- **« Où part l'argent » dit ce qu'il compte** : son état vide annonce « Aucune charge ni crédit » — il annonçait « Aucune sortie » sur un mois où 400 € étaient partis sur un livret — et sa lecture d'écran nomme les charges et les crédits, pas « les sorties ».
- **La feuille du Solde du mois explique enfin l'épargne** : un versement y compte comme une sortie — l'argent quitte bien le compte — et c'est la capacité d'épargne qui le met à part. C'était la question la plus fréquente devant ce chiffre, et aucune des trois feuilles n'y répondait.
- **Le calendrier a sa porte Épargne**, comme le mois et le bouton flottant : mettre de côté depuis un jour choisi passait par « Dépense ».

### Ajouté — revenir au mois courant

- **« Ce mois-ci »** dans le bandeau du mois, à droite de la navigation. Parti en février 2025 depuis un mois d'août, il fallait douze chevrons pour rentrer, ou recharger la page. Le bouton n'apparaît que lorsqu'on n'est pas sur le mois courant, et il vaut pour tous les écrans rattachés à un mois : le mois, le calendrier, la répartition.

### Tenu — les promesses du design system

Le README fait du design system une source de vérité : « le code lui obéit, et un écart est un bug ». Cinq de ses promesses n'étaient pas tenues. Aucune ne touche au document : `schemaVersion` reste à 6.

- **L'anneau du mois est sur l'écran du mois.** Le DS §1 en fait la signature de l'app, la page de présentation le démontrait aux visiteurs « comme sur le mois », et le vrai tableau de bord n'en avait pas : la progression s'y lisait en une phrase. Il se pose sur la tuile Solde, sur la phrase qu'il dessine : mesuré, une 2×2 n'offre pas la largeur de le mettre à côté du chiffre héros.
- **Les grands nombres comptent au premier affichage**, et une seule fois : le DS §4 le promettait sans que rien ne l'implémente. Ceux de la grille bento et le chiffre héros seulement ; jamais sur mise à jour, donc jamais en changeant de mois ni de filtre ; rien du tout sous « réduire les animations ». Le DS dit désormais lesquels et à partir de quand, faute de quoi la règle se lisait de deux façons.
- **Les graphiques se lisent.** Une période focusable par mois sur les douze derniers mois comme sur le comparatif d'années, à la souris et au clavier (flèches, `Origine`, `Fin`), avec les valeurs du mois lu au-dessus du tracé et un axe des ordonnées qui manquait tout à fait. La légende y a été absorbée : elle disait les mêmes mots sans les chiffres.
- **« Tout replier » sur la répartition**, comme le DS §6 le promet et comme le font déjà le mois, les abonnements et les catégories.
- **Un glyphe par concept**, déclaré une seule fois (DS §9.2) : trois paires d'icônes se partageaient un même trait, dont deux pour un seul et même concept. Le catalogue du styleguide, qui se disait entier, en montre enfin la totalité.

### Corrigé — au passage

- **« Douze derniers mois » n'était pas les douze derniers mois** : la fenêtre s'arrêtait au mois choisi dans le bandeau de l'écran du mois. Or l'historique n'a pas de bandeau : rien n'y montrait cette borne, rien ne permettait de la bouger. Passer voir février 2026 puis ouvrir l'historique donnait douze mois sans le mois courant dedans. Elle s'arrête à aujourd'hui, et le nom accessible du graphique dit ses deux bornes au lieu d'un mois.
- **Le comptage des nombres était incohérent d'une tuile à l'autre.** Il suivait le premier affichage d'un *composant* et non d'un *écran* : un filtre par membre remonte cinq tuiles de la grille et laisse les autres en place, si bien que sur un même geste le solde et les revenus s'égrenaient et les charges sautaient. Ce qui apparaît après l'arrivée de l'écran ne compte plus.

- Le **cumul du solde décalait ses points** d'une demi-tranche : il les ancrait aux bords quand la bande des mois sous lui découpe la largeur en douze parts égales, si bien que janvier se lisait à gauche de la lettre qui le nomme.
- La **bande des mois des douze derniers mois débordait de 71px à 320** et se faisait trancher par sa tuile : douze libellés courts en mono ne rétrécissent pas. L'initiale suffit tant que la place manque.
- Un **raccourci clavier de l'app se déclenchait par-dessus** un composant qui avait déjà répondu à la même touche.

### Corrigé — domaine et import

Issus d'un audit complet du code, revérifiés point par point. Aucun ne change le format du document : `schemaVersion` reste à 6.

- **Retirer un membre laissait ses avances derrière**, avec l'identifiant d'un porteur disparu : `Advance.memberId` n'est pas facultatif, donc elles ne pouvaient pas repasser au foyer comme le reste. Elles sont supprimées, la confirmation l'annonce, et la récurrence qui reconstitue le livret reste.
- **Un revenu chiffré à zéro donnait 0 % des charges communes** au membre qui le portait, en silence : la répartition ne refusait de répondre que si la *somme* des revenus était nulle. Elle refuse désormais dès qu'une source vaut zéro, et les écrans disent laquelle des trois raisons c'est.
- **Une ressource déclarée pour dans cinq ans pesait dès aujourd'hui** dans le prorata. L'horizon est borné à un trimestre.
- **Le montant saisi sur une échéance prévue** était écrasé par la règle dès qu'on éditait la récurrence.
- **La tuile des prochaines échéances pouvait en compter une deux fois**, quand un document importé portait une échéance prévue dans un mois jamais ouvert.
- **Un montant au-delà de 2^53 centimes s'enregistrait faux** sans que rien ne puisse l'attraper. La saisie est plafonnée.
- **Une avance pouvait se terminer avant de commencer** : rien ne revenait alors jamais sur le livret. Refusé à la saisie comme à l'import.
- **Un mois « 2026-13 » passait la validation** et s'affichait sans nom.
- **L'import était muet sur ce qu'il écartait** : une entrée illisible disparaissait sans un mot, au seul moment où l'on pouvait encore le voir. La confirmation affiche désormais le détail, ligne par ligne.
- **Aucune vérification référentielle à l'import** : une catégorie inconnue rendait une dépense commune et partagée, un membre inconnu la faisait disparaître des vues filtrées, et deux lignes pouvaient porter le même identifiant. Les liens sont recollés, coupés ou redirigés vers « À ranger », et le rapport le dit.
- **Effacer ses données laissait la date du dernier export** derrière elle : l'app repartait de zéro en annonçant la sauvegarde d'un document disparu.
- **Quatre chemins asynchrones sans filet** : l'import et l'effacement annonçaient une réussite qui n'avait pas eu lieu, le jeu d'exemple et le schéma laissaient un clic sans effet hors ligne.
- **Les toasts d'erreur étaient annoncés poliment** aux lecteurs d'écran, donc après tout le reste, y compris « les modifications ne s'enregistrent plus ».
- **Replier une liste laissait des sections ouvertes** : les événements émis dans le même tour se recouvraient.
- **L'export n'était fiable que sur Chrome** : ancre jamais posée dans le document, URL révoquée trop tôt.
- **Les identifiants repartaient de zéro à chaque rechargement** hors contexte sécurisé, par exemple en testant l'app sur son téléphone en `http://`.

### Ajouté — les gestes qui manquaient

Issus du même audit, côté usage cette fois. Aucun ne change le format du document : `schemaVersion` reste à 6.

- **Défaire une suppression.** Onze gestes passaient par une confirmation et aucun n'offrait de retour arrière : une entrée supprimée était irrécupérable. Le message qui l'annonce porte désormais « Rétablir », huit secondes durant. Il remet l'état d'avant tel quel, y compris pour un retrait de membre, qui touche à dix endroits à la fois. La confirmation reste : elle se pose avant, le retour arrière rattrape le oui donné trop vite.
- **Garde de brouillon** sur les quatre écrans de saisie : entrée, récurrence, crédit, avance. « Annuler » et le retour jetaient la saisie sans prévenir. Un formulaire ouvert puis quitté sans rien changer ne demande toujours rien.
- **Recherche par libellé sur l'historique**, tous mois confondus, entrées et récurrences : retrouver « ce prélèvement de mars » imposait de naviguer mois par mois. Accents et casse mis de côté, chaque résultat mène à sa fiche.
- **Filtre du catalogue de catégories** dans les réglages : quarante-six catégories sous onze familles repliées, et il fallait deviner que « Carburant » est rangée sous Transport.
- **Tri des récurrences par montant**, à côté du tri par prochaine échéance. C'est l'écran de « qu'est-ce qui me coûte le plus », et il ne savait pas y répondre.
- **Raccourcis clavier** : `←` / `→` changent de mois, `n` ouvre une dépense, `Échap` referme le panneau du jour au calendrier. L'app n'en avait aucun. Chacun se dit en infobulle sur le geste qu'il double.
- **Navigation entre mois sur l'écran Répartition**, qui lisait le mois affiché sans offrir d'en changer : vérifier la répartition de juillet imposait de repasser par l'écran du mois.

### Modifié

- **« Reste à vivre » ne s'affiche plus hors du mois courant.** Le chiffre arrête le prévisionnel à la prochaine rentrée d'argent à partir d'aujourd'hui : sur un mois passé ou à venir, il se calculait quand même et ne voulait rien dire.
- **Le mois se balaie aussi à la souris et au stylet**, comme le rappel d'export : le geste était en TouchEvents, donc réservé au doigt.
- **Les renommages n'écrivent plus à chaque frappe** — catégorie, famille, nom du foyer, prénom d'un membre —, mais à la sortie du champ, comme tous les formulaires de l'app.
- **L'historique d'un foyer neuf** montre une seule invitation au lieu de trois phrases d'excuse empilées.

### Ajouté — ce que le téléphone n'avait pas

- **Bouton de saisie flottant**, sous 1024px, au-dessus de la barre d'onglets. Les trois portes — dépense, revenu, épargne — vivaient en tête de l'écran du mois, dans le flux : elles défilaient avec la page, et disparaissaient tout à fait sur un mois vide. Le geste le plus fréquent de l'app demandait donc de remonter d'abord. Il se déplie sur les trois plutôt que d'en promettre une, se referme sur Échap, sur un appui à côté, et à tout changement d'écran ; rien sur un écran de saisie, où il partirait créer une ligne par-dessus celle qu'on écrit. La rangée en tête de page reste, à partir de 1024px : une porte par largeur, et pas deux.
- **Palier tablette** dans la grille bento : quatre colonnes entre 768 et 1024px. Entre les deux, on avait la mise en page d'un téléphone étirée sur la pleine largeur d'un iPad. Aucun format du design system ne change : seule la correspondance format → colonnes.

### Corrigé — la seconde lecture des flux

- **« Reste 102 € à payer » se lit enfin sur un téléphone.** Sur les tuiles Revenus et Charges, cette ligne n'était affichée qu'au-delà de 1024px et aucune feuille d'explication ne la portait ailleurs : sous cette largeur, l'information n'était lisible nulle part. Les deux tuiles prennent désormais deux colonnes sous 1024px, ce qui lui donne la place.
- **Ce qui se masque faute de place se décide sur la place**, et non sur la largeur de l'écran : la règle est passée en requête de conteneur, sur la tuile elle-même. C'est ce qui rendait la précédente fausse dès qu'un format ne faisait plus la même largeur sur les trois paliers.

### Ajouté — installation et hors-ligne

- **L'installation se propose**, sur la page de présentation, sous la phrase qui vient de dire qu'il n'y a ni compte ni serveur. Elle ne l'était nulle part, pour l'app qui a le plus de raisons de le faire : un site non installé voit ses données effacées par Safari après environ une semaine sans visite. Rien n'est affiché quand le navigateur ne propose pas son invite : pas de détection, pas de marche à suivre écrite d'avance.
- **Indicateur hors-ligne** sur cette même page. L'app fonctionne sans réseau depuis toujours et ne l'avait jamais dit. Il annonce ce qui continue, pas ce qui manque.
- **Raccourcis du manifest** — « Ajouter une dépense » et « Le mois » — au maintien sur l'icône de l'app installée, et **captures d'écran** sur la fiche d'installation d'Android.
- **`og:image`, `robots.txt` et un repli sans JavaScript** : un lien partagé montrait son domaine, et la page était blanche pour qui n'exécute pas de script.

### Modifié — service worker et manifest

- **L'orientation n'est plus verrouillée en portrait** : la grille passe à quatre colonnes dès 768px et à six dès 1024, ce qu'une tablette n'atteint qu'en paysage.
- **Le manifest porte un `id` fixe.** Sans lui, changer un jour la page d'arrivée aurait fait de l'app une seconde app, installée à côté de la première, dont les données seraient restées là où plus personne ne va les chercher.
- **Le precache a une borne déclarée** et exclut les captures. Workbox écarte en silence tout fichier au-delà de sa borne par défaut : l'app serait restée installable et aurait cessé de fonctionner hors ligne sans que rien ne le dise.
- **Le service worker s'essaie en développement** avec `PWA_DEV=1 npm run dev`.
- **Les captures vivent dans `public/captures/`** : le `README`, le manifest et le partage les servent tous les trois, et il n'y en a qu'un exemplaire.

### Corrigé — ce que les lecteurs d'écran et le clavier ne trouvaient pas

Le socle était déjà bon : lien d'évitement, lecture accessible de chaque graphique, contrastes calculés, `prefers-reduced-motion` traité à trois niveaux. Restaient sept écarts, tous vérifiés sur le code. Aucun ne touche au document : `schemaVersion` reste à 6.

- **Un montant pouvait être annoncé vide.** `Amount` — qui porte *tous* les montants de l'app — posait son nom accessible dans un `aria-label` sur un `span` sans rôle, ce qu'ARIA 1.2 interdit ; les lecteurs qui appliquent la règle l'ignoraient, et tout le rendu visuel étant masqué, il ne restait rien à dire. Le montant est désormais un texte caché à l'œil.
- **Trois tuiles enfermaient une liste dans un `<button>`** : les parts de chacun, les deux montants d'une part de foyer, les quatre chiffres d'un crédit. Du contenu de flux dans un élément qui n'admet que des phrases, et un nom unique derrière lequel toutes les lignes disparaissaient. Elles suivent le motif du DS §6 : tuile non cliquable, vrai lien au coin, le repère du coin lui-même, qui ne coûte rien au budget vertical d'une 2×2.
- **La bascule `Segmented` annonçait des boutons radio sans en tenir la promesse** : chaque position était un arrêt de tabulation — neuf pour trois choix sur l'écran de saisie — et les flèches ne faisaient rien. Elle suit l'APG sur les cinq écrans qui l'emploient.
- **Changer d'écran ne se disait pas.** Le focus restait sur le lien de navigation activé, et rien n'annonçait où l'on venait d'arriver. Le titre se dit dans une région live de la coquille, le focus part au contenu, sauf là où l'écran a posé le sien, comme le premier champ d'une saisie.
- **Une case du calendrier faisait 32px de large** sous 404px de fenêtre, pour une cible que le DS §8 fixe à 44px. C'est la gouttière qu'on sacrifie : la tuile resserre son cadre sur les petites largeurs et les sept colonnes se joignent, ce qui rend 44,4px par colonne à 375px. La carte, elle, reste une carte.
- **`EmptyState` se déclarait région live** en permanence, sur un texte qui ne change jamais.
- **Le `<h1>` s'écrivait de trois façons**, et le calendrier n'en avait aucun : rien ne le nommait à un lecteur d'écran. `PageTitle` porte les trois formes, et c'est de là que vient l'annonce d'écran.

### Modifié — ce qui deviendra visible sur des années de saisie

Rien d'urgent à l'échelle d'un document d'exemple. Trois points qui grandissent avec l'usage, et une mesure pour que les choix tiennent.

- **Le mois se balaie une fois par rendu, et non dix.** Une dizaine de hooks lisent la même portée du mois, et le tableau de bord les appelle presque tous ; chacun refaisait le parcours complet du document pour son compte. Il a fallu remonter aux revenus du mois et à la nature d'une catégorie, eux-mêmes recalculés par chaque consommateur. La lecture par membre de l'épargne, qui balayait tout le document une fois par personne, le fait désormais une fois pour tout le foyer.
- **Quatre écrans ne voyagent plus avec l'app** : le nuancier — neuf cents lignes de route de développement que chaque visiteur téléchargeait —, l'historique et ses graphiques, les réglages, la présentation. Le premier chargement passe de 202 à 192 Kio compressés.
- **Le prévisionnel s'arrête à douze mois.** Chaque « mois suivant » ouvrait le mois, y écrivait toutes les échéances, et repoussait la borne d'un cran : cent clics valaient cent mois de prévisionnel définitivement écrits. La navigation cesse de proposer au-delà, et le store cesse d'écrire.
- **`npm run size` mesure le premier chargement** et le tient sous un budget. Un découpage par route ne se maintient pas tout seul : il suffit d'un import statique au mauvais endroit pour tout ramener, ce qui était arrivé au nuancier. La commande entre dans `npm run verify`, que la CI rejoue.

## [1.0.0] — 2026-08-02

Première version publique. Le périmètre est celui de la v1 du [cahier des charges](docs/CAHIER-DES-CHARGES.md).

### Ajouté

- **Récurrences** à montant fixe ou variable — salaires, loyer, abonnements, mensualités — rangées en quatre natures : Ressources, Charges, Crédits, Versements.
- **Ouverture du mois** automatique et idempotente : afficher un mois non passé génère ses échéances prévues, qu'on confirme au fil de l'eau.
- **Dépenses et recettes ponctuelles**, avec catégories rangées en familles.
- **Crédits** avec capital restant dû calculé — jamais stocké — depuis le nombre de mensualités confirmées.
- **Répartition des charges communes** entre membres au prorata des revenus, par plus forts restes, et **régularisation** sur le mois suivant quand une charge commune a été avancée par une seule personne.
- **Avances** : une charge payée en une fois depuis l'épargne, remboursée mois par mois.
- **Capacité d'épargne**, ventilation par support et reste à placer, par personne.
- **Calendrier** des échéances, **historique** des mois passés et comparatifs mois/mois et année/année.
- **Export / import** du fichier de données, avec validation à l'import et rappel d'export tous les trente jours.
- **Schéma de données** à copier ou télécharger, dérivé du code, pour faire transcrire des notes déjà écrites par un assistant.
- **Jeu d'exemple** de quinze mois, construit à la date du jour plutôt que figé.
- **Thème clair et sombre**, **PWA** installable et utilisable hors ligne.
- **Styleguide** à `/styleguide` : chaque token et chaque composant dans les deux thèmes.

### Sécurité

- Aucune requête réseau ne transporte de donnée du foyer : l'app n'en émet aucune. Pas de compte, pas de serveur, pas d'analytics, pas de cookie tiers.

[Non publié]: https://github.com/alarboulletmarin/tout-compte-fait/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/alarboulletmarin/tout-compte-fait/releases/tag/v1.0.0
