/* ============================================================================
 * La présentation, en anglais. Le rationale de chaque formule est dans
 * `landing.ts`, avec le français.
 * ==========================================================================*/

import type { LandingStrings } from './landing'

export const en: LandingStrings = {
  intro:
    'You write down once what comes back every month — rent, subscriptions, salaries. The next month opens already filled with what’s planned, and you confirm as you go what actually landed.',
  start: 'Create my tracker',
  open: 'Open my month',
  exampleHint: 'Just want to see what it looks like? A complete example, in one click.',
  privacy: 'No account, no server. Two questions, and the app is usable.',

  free: 'Free, ad-free and never resold: there’s nothing to sell since nothing is collected, and nothing to fund since there is no server.',

  installTitle: 'Install it on your device',
  installBody:
    'It opens full screen, works offline, and above all: a site that isn’t installed has its data erased by Safari after a week without a visit. Installed, it keeps it.',
  installAction: 'Install',

  offline: 'Offline — everything keeps working',

  monthTitle: 'Planned, then confirmed',
  monthHint: 'confirmed out of planned',
  monthRing: 'Share of the month already confirmed',
  /* La devise reste l'euro : la démonstration lit les mêmes montants que
     `features/landing/sample.ts`, et une livre écrite ici mentirait sur ce que
     la grille juste à côté affiche. */
  monthRingRead: '75 % of the month is confirmed, that is €1,920 out of €2,560.',
  monthOf: '%s of %s',
  incomeHint: 'salaries and benefits for the month',
  splitTitle: 'Everyone their share',
  privacyTitle: 'Nothing leaves here',
  privacyShort: 'No account, no server.',

  principles: 'What sets this app apart',
  monthBody:
    'The month opens on its own with everything that comes back. You tick off what landed; the rest goes on showing as planned, without disappearing from the forecast.',
  splitBody:
    'Shared costs are split between members in proportion to their incomes, and the shares add up to exactly the total, to the penny. What a single person paid up front is settled the following month.',
  privacyBody:
    'No account, no server, no analytics. Your data lives in this browser, and the export is the only way out — you’re the one who opens it.',

  kindsTitle: 'Four kinds, one single flow',
  kindsBody:
    'Nothing is filed under bank accounts: everything is money in or money out, under one of the four kinds. The direction says whether money comes in or goes out, the kind says what becomes of it — a transfer to a savings account leaves the account just like a tank of fuel, but one is moved and the other consumed.',

  sample: 'The figures above are from an example.',

  proof: 'The calculation, in full',
  proofBody:
    'The same example, from the calculation’s side. A split between two people isn’t taken on trust: it’s checked line by line, and it’s the screen’s job to make that possible.',

  settlement: 'Last month’s settlement',
  advanced:
    '%s paid %s of shared costs up front last month. Everyone owed their share: the following month makes up the difference, without changing what the month cost anyone.',

  capacityBody:
    'A contribution to a savings account isn’t a cost: it leaves the account, but it stays with whoever makes it. The month balance, for its part, counts it as spending — that’s why this figure exists alongside it.',

  questions: 'What you wonder before trying',

  deviceTitle: 'What if I change phone?',
  deviceBody:
    'Nothing follows on its own: the data is in this browser. You export a file from the settings, you import it on the new device, and everything is there — members, recurring rules, past months. It’s the same file that serves as a backup, and the app reminds you after thirty days.',

  lossTitle: 'What if I clear my browser?',
  lossBody:
    'Everything is erased, and nobody can give it back to you: that’s the exact trade-off for “nothing leaves here”. Two things cover it — installing the app, which stops Safari purging the data after a week without a visit, and exporting from time to time.',

  catchTitle: 'It’s free — where’s the catch?',
  catchBody:
    'There isn’t one, and it can be checked rather than promised: the code is open, under the AGPL-3.0 licence. Anyone can read what the app does with your data. And what leaves here stays open — a modified version has to be published under the same licence, even when it’s only put online.',

  whoTitle: 'Who are you?',
  whoBody:
    'A person, not a company: a personal project, written and maintained alone, with no team and no investor. The publisher is named, with contact details, in the legal notice — the law requires it, and a finance app that hid who publishes it wouldn’t deserve to be trusted with anything.',

  verifyTitle: 'Check rather than believe',
  verifyBody:
    'The specification says what the app does and what it will never do; the design system says what it looks like. Both have authority over the code: when one of them and the code disagree, that’s a bug. They’re in the repository, with the rest.',

  doors: 'Two ways not to start from a blank page',
  importTitle: 'Restore an export',
  importHint:
    'Already have a Tout compte fait file? Restore it without going through the questions.',
  schemaTitle: 'Start from your notes',
  schemaHint:
    'Your accounts are already written down somewhere? Give this schema to an assistant along with your notes, and it will make you a file to import.',
}
