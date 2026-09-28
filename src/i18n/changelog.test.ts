import { describe, expect, it } from 'vitest'
import changelogEn from '../../CHANGELOG.en.md?raw'
import changelog from '../../CHANGELOG.md?raw'
import { parseChangelog } from './changelog'

describe('parseChangelog', () => {
  it('découpe versions, dates et points', () => {
    const md = [
      '# Changelog',
      '',
      '## 1.1.0 — 2026-11-02',
      '- Un',
      '- Deux',
      '',
      '## 1.0.0',
      '- Zéro',
    ].join('\n')
    expect(parseChangelog(md)).toEqual([
      { version: '1.1.0', date: '2026-11-02', items: ['Un', 'Deux'] },
      { version: '1.0.0', date: '', items: ['Zéro'] },
    ])
  })

  it('ignore les points avant la première version', () => {
    expect(parseChangelog('- orphelin\n## 1.0.0\n- a')).toEqual([
      { version: '1.0.0', date: '', items: ['a'] },
    ])
  })

  it('lit le CHANGELOG du dépôt, version du paquet en tête', async () => {
    const { version } = (await import('../../package.json')).default
    const releases = parseChangelog(changelog)
    expect(releases[0]?.version).toBe(version)
    expect(releases[0]?.items.length).toBeGreaterThan(0)
  })

  it('tient le changelog anglais au même niveau que le français', () => {
    const fr = parseChangelog(changelog)
    const en = parseChangelog(changelogEn)
    expect(en.map((r) => [r.version, r.items.length])).toEqual(
      fr.map((r) => [r.version, r.items.length]),
    )
  })
})
