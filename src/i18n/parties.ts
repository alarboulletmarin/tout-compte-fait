/* ============================================================================
 * Qui édite le site et qui l'héberge. Des faits, pas de la prose.
 *
 * **Un module à part, et c'est une nécessité et non un rangement.** Ces deux
 * constantes sont lues par les deux versions des mentions légales ; les laisser
 * dans `legal.ts`, qui importe la version anglaise, faisait un cycle — et un
 * cycle dont le mauvais côté gagnait : `legal.en.ts` s'évaluait le premier et
 * lisait `HOST` avant son affectation, donc `undefined`. Le symptôme était une
 * page juridique qui ne s'ouvrait pas du tout.
 *
 * Rien ici ne dépend de la langue : un nom propre, une adresse postale, un
 * numéro de téléphone et un domaine s'écrivent pareil dans les deux. Le seul
 * mot qui en dépendait — le pays — a rejoint les documents.
 * ==========================================================================*/

/**
 * L'hébergeur, que la loi impose de nommer avec son adresse et son téléphone
 * (LCEN, article 1-1 depuis la loi SREN du 21 mai 2024).
 *
 * Coordonnées relevées sur les registres publics d'entreprises américains ;
 * Vercel publie les siennes sur `vercel.com`, et c'est là qu'il faut aller les
 * revérifier — une adresse d'hébergeur qui a bougé rend la mention fausse, donc
 * inutile, et c'est le genre de ligne que personne ne relit jamais.
 */
export const HOST = {
  name: 'Vercel Inc.',
  /* Sans le pays : « États-Unis » et « United States » sont un mot de langue,
     et chaque document l'écrit dans la sienne. */
  address: '440 N. Barranca Ave #4133, Covina, CA 91723',
  phone: '+1 (951) 383-6898',
  url: 'https://vercel.com',
} as const

export const PUBLISHER = {
  name: 'Andréa Larboullet Marin',
  domain: 'toutcomptefait.xyz',
} as const
