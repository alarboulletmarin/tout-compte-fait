/* ============================================================================
 * Les trois textes juridiques, en anglais.
 *
 * **Une traduction, et rien de plus.** Le droit ne suit pas la langue de
 * lecture : l'éditeur reste une personne physique française, l'hébergeur reste
 * le même, la LCEN et le RGPD s'appliquent toujours, et les conditions restent
 * soumises au droit français. Ce fichier dit donc exactement ce que dit
 * `legal.ts`, dans la langue de qui lit — et les références aux textes gardent
 * leur nom d'origine, parce qu'un article de loi ne se traduit pas : « article
 * 1-1 of the LCEN » se retrouve, « article 1-1 of the French Digital Economy
 * Act » ne se retrouve pas.
 *
 * Le ton est celui du reste de l'app : on dit ce qui se passe, pas « the
 * Company implements all reasonable measures ».
 * ==========================================================================*/

import type { LegalDocument } from './legal'
import { HOST, PUBLISHER } from './parties'

const UPDATED = 'August 2026'

export const legalNotice: LegalDocument = {
  intro:
    'Who publishes this site, who hosts it, and under which licences it is released. This information is mandatory: article 1-1 of the LCEN — the former article 6 III, moved by the law of 21 May 2024 — requires every publisher to make themselves identifiable.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Publisher',
      body: [
        `${PUBLISHER.name}, a private individual acting in a non-professional capacity. Tout compte fait is a personal project, free of charge, with no commercial activity: no advertising, no subscription, nothing resold — there would be nothing to resell anyway, since no data ever leaves your device.`,
        'Publication director: the same person.',
      ],
    },
    {
      heading: 'Contacting the publisher',
      body: [
        'The code repository is the point of contact: a public issue for a bug, a question or a request, and GitHub’s private reporting for a security flaw or for anything that shouldn’t be public.',
        'The link is at the bottom of this page, and on the “About” screen.',
      ],
    },
    {
      heading: 'Host',
      body: [
        `${HOST.name} — ${HOST.address}, United States — ${HOST.phone} — ${HOST.url}`,
        'The site is served from this host’s infrastructure. There is no other server: the app is a set of static files, and all the computing happens in your browser.',
      ],
    },
    {
      heading: 'Domain name',
      body: [`${PUBLISHER.domain}, registered by the publisher.`],
    },
    {
      heading: 'Code and licences',
      body: [
        'The code of Tout compte fait is released under the GNU Affero General Public License, version 3 or later: it can be read, copied, modified, redistributed and hosted, including commercially. The trade-off is that any modified version must be released under the same licence — and article 13 requires it as soon as it goes online, without anything having to be distributed. The full text is in the repository, linked at the bottom of this page.',
        'Versions released before this one were released under the MIT licence and remain so: the licence change only applies from here on.',
        'The app embeds third-party components carrying their own licences — six under MIT, one under ISC, and two fonts under the SIL Open Font License 1.1, which requires being distributed with them. Their full notices are served with the app, and the link is at the bottom of this page.',
      ],
    },
    {
      heading: 'What this site is not',
      body: [
        'Tout compte fait is not a bank or a payment service provider. No bank account is connected to it, no statement is read, no transaction is carried out: the app computes on the figures you enter, and nothing else. As such it falls under no authorisation regime.',
      ],
    },
  ],
}

export const privacyPolicy: LegalDocument = {
  intro:
    'Your data does not leave your device. Neither the publisher, nor the host, nor anyone else can read it — there is no server where it could be found.',
  updated: UPDATED,
  sections: [
    {
      heading: 'What the app saves, and where',
      body: [
        'Everything you enter — people, categories, recurring rules, entries, loans, advances — is saved in your browser’s IndexedDB database, on your device. That is the only place this information exists.',
        'To which five tiny settings are added, in the same browser’s local storage: the chosen theme, the chosen palette, the date of your last export, the date on which you dismissed the export reminder, and the fact that you closed the first-launch notice. They describe this device, which is why they don’t appear in an exported file.',
        'None of this is transmitted. The app makes no network request to a third party: it contains neither a call to a remote interface, nor an external resource — the fonts themselves are served from the site, precisely so that no request goes anywhere else.',
      ],
    },
    {
      heading: 'No account, no analytics',
      body: [
        'There is no sign-up, so no email address, no password, no identifier. There is no statistics tool, no advertising cookie, no tracker of any kind, and no sharing with a third party — for the simple reason that there is nothing to share.',
      ],
    },
    {
      heading: 'The only processing of personal data',
      body: [
        'Serving a page leaves a trace at the host: its technical logs keep the IP address of whoever connects, the timestamp and the address requested. That is how a web server normally works, and it is the only processing of personal data for which the publisher is responsible.',
        'Purpose: running the site and protecting it from abuse. Legal basis: the publisher’s legitimate interest in providing a service that stays up (article 6.1.f of the GDPR). Retention: whatever the host applies to its own logs.',
        `Processor: ${HOST.name}, in the United States. The transfer relies on its certification under the EU–U.S. Data Privacy Framework, whose public list is maintained by the U.S. Department of Commerce.`,
      ],
    },
    {
      heading: 'Why there is a notice, and not a consent banner',
      body: [
        'Writing or reading something on your device requires your consent in principle — and the rule covers local storage and IndexedDB, not only cookies. It has one exception: whatever is strictly necessary to provide the service you expressly asked for.',
        'That is exactly the case here. The IndexedDB database is your data itself: without it, there is no app. The five local-storage settings serve the display, the backup reminder and the first-launch notice, nothing else. No identifier, no tracking, no transmission. So there is nothing to make you consent to, and a consent banner would make you click for nothing.',
        'What you saw at first launch is not one. It doesn’t ask you to accept, it doesn’t offer to refuse, and closing it changes nothing about what the app does: it behaves exactly the same before and after. It’s a read receipt, and it exists because this very page was worth nothing as long as it could only be read here. Someone who arrives wary enters their income before crossing a single one of these lines.',
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'Over your data, they are exercised directly, without going through anyone: the export hands you a complete file, every line can be corrected or deleted in the app, and “Erase everything” in the settings leaves none of your data behind: the database is emptied, the local backups too, and both backup dates go with them. That is the direct consequence of this data being yours alone.',
        'Three things stay in local storage after an erase, because none of them speaks of your data: the theme, the palette, and the fact that you closed the first-launch notice. Erasing what you entered doesn’t make you forget what you read, or chose.',
        'Over the host’s logs, the request goes through the repository — the link is at the bottom of this page. You may also lodge a complaint with the CNIL, the French data protection authority.',
      ],
    },
    {
      heading: 'The trade-off, which you need to know',
      body: [
        'Since nothing is elsewhere, nothing can be recovered elsewhere. Clearing your browser’s data erases it, and nobody — the publisher included — can give it back to you. Nothing syncs from one device to another either.',
        'Hence the export, a file you keep wherever you like, and the reminder the app sends you after thirty days. On iPhone, install the app on the home screen: Safari erases the data of a site that isn’t installed after about seven days without a visit.',
      ],
    },
  ],
}

export const terms: LegalDocument = {
  intro:
    'What the service promises, and what it doesn’t. It’s short, because there is no account, no payment and no data collected — so almost nothing to frame.',
  updated: UPDATED,
  sections: [
    {
      heading: 'What these terms cover',
      body: [
        `They cover the service provided at ${PUBLISHER.domain}. They don’t cover the code: that is released under the AGPL-3.0 licence, and it’s that licence — and only that licence — that says what you may do with it if you take it to run elsewhere.`,
        'Using the site counts as accepting what follows.',
      ],
    },
    {
      heading: 'A free service, provided as is',
      body: [
        'Tout compte fait is made available free of charge, with no guarantee of availability, continuity or absence of defects. The service may change, be interrupted or stop, without notice and without compensation. The code being open, anyone remains free to host it themselves: that is the guarantee this page cannot give.',
      ],
    },
    {
      heading: 'This is not advice',
      body: [
        'The app keeps books, it gives no opinion. It provides no financial advice, no tax advice, no legal advice, and is connected to no bank account: it computes on the figures you enter, and its accuracy goes no further than theirs.',
        'Checking a figure before making a decision from it is up to you. Projections — forecast, capital still owed, split — are computations on declared data, not commitments.',
      ],
    },
    {
      heading: 'Your data is your responsibility',
      body: [
        'It lives in your browser, and nowhere else. Keeping it is therefore up to you: the export is the only backup that exists, and you are the one who triggers it. The publisher can neither consult it, nor restore it, nor produce a copy of it — that isn’t reluctance, it’s a technical impossibility, and it’s the same one that stops anyone else reading it.',
      ],
    },
    {
      heading: 'Liability',
      body: [
        'To the extent permitted by law, the publisher cannot be held liable for the loss of data stored on your device, for any unavailability of the service, or for the consequences of decisions taken from the figures displayed.',
        'Nothing in this paragraph excludes liability that cannot be excluded under French law, in particular in cases of gross negligence or wilful misconduct.',
      ],
    },
    {
      heading: 'Fair use',
      body: [
        'You are responsible for what you enter. The site hosts no public content and allows none to be published: there is nothing to moderate, and nothing you write can reach a third party.',
      ],
    },
    {
      heading: 'Governing law',
      body: [
        'These terms are governed by French law. Failing an amicable agreement, disputes fall to the competent French courts.',
      ],
    },
  ],
}
