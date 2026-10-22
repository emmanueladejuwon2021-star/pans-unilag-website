import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EventModel } from '../src/modules/events/infrastructure/event.model.js'
import {
  coversRange,
  GradingScaleModel,
} from '../src/modules/grading/infrastructure/gradingScale.model.js'
import { SettingsModel } from '../src/modules/settings/infrastructure/settings.model.js'

type Row = Record<string, unknown>
const load = (file: string) =>
  JSON.parse(readFileSync(new URL(`../seed/${file}`, import.meta.url), 'utf8')) as Row[]
const events = load('events.json')
const committees = load('committees.json')
const [grading] = load('grading.json') as [Row & { grades: Row[]; bands: Row[] }]
const [settings] = load('settings.json') as [Row & { socialLinks: Row[] }]

describe('seed/events.json', () => {
  it('has 9 days each of Health Week 2026 and Pharmalympics 2026, with dates still to confirm', () => {
    for (const series of ['PANS Health Week 2026: Redefine+', 'Pharmalympics 2026']) {
      const days = events.filter((e) => e.series === series)
      expect(days.map((e) => e.dayNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
      expect(days.every((e) => e.datePrecision === 'unknown' && e.isPlaceholder === true)).toBe(
        true,
      )
    }
  })

  it('has the four upcoming 2026/27 events in Lagos time, months only where that is all we know', () => {
    const bySlug = Object.fromEntries(events.map((e) => [e.slug, e]))
    expect(bySlug['freshers-week-2026']).toMatchObject({
      startsAt: '2026-11-30T00:00:00+01:00',
      endsAt: '2026-12-04T23:59:59+01:00',
      datePrecision: 'day',
    })
    expect(bySlug['pharmalympics-2027']).toMatchObject({
      startsAt: '2027-04-01T00:00:00+01:00',
      endsAt: '2027-05-31T23:59:59+01:00',
      datePrecision: 'month',
    })
    expect(bySlug['health-week-2027']).toMatchObject({
      startsAt: '2027-06-07T00:00:00+01:00',
      endsAt: '2027-06-11T23:59:59+01:00',
      datePrecision: 'day',
    })
    expect(bySlug['pans-dinner-2027']).toMatchObject({
      startsAt: '2027-09-01T00:00:00+01:00',
      endsAt: '2027-09-30T23:59:59+01:00',
      datePrecision: 'month',
    })
  })

  it('links only to committees that exist', () => {
    const slugs = new Set(committees.map((c) => c.slug))
    for (const e of events.filter((e) => e.committee))
      expect(slugs.has(e.committee), String(e.slug)).toBe(true)
  })

  it('has clean titles (no "Day" prefix or folder typos)', () => {
    expect(events.every((e) => !/day\s*\d|9Q/i.test(String(e.title)))).toBe(true)
  })
})

describe('Event model date rules', () => {
  const base = { slug: 'x', title: 'X' }

  it.each([
    ['exact dates missing', { datePrecision: 'day' }, /startsAt is required/],
    [
      'an end before the start',
      { startsAt: '2027-06-11', endsAt: '2027-06-07' },
      /endsAt must not be before startsAt/,
    ],
    ['unknown dates on a non-placeholder', { datePrecision: 'unknown' }, /must be a placeholder/],
    [
      'unknown dates with dates set',
      {
        datePrecision: 'unknown',
        startsAt: '2026-01-01',
        isPlaceholder: true,
        placeholderNote: 'n',
      },
      /must not have startsAt/,
    ],
    [
      'a cover photo without alt text',
      {
        startsAt: '2027-06-07',
        endsAt: '2027-06-11',
        coverImage: 'pans-unilag/events/health-week-2027/cover',
      },
      /alt text/,
    ],
    [
      'a non-https registration link',
      { startsAt: '2027-06-07', endsAt: '2027-06-11', registrationUrl: 'http://x.com' },
      /https/,
    ],
  ])('rejects %s', async (_case, change, message) => {
    await expect(new EventModel({ ...base, ...change }).validate()).rejects.toThrow(message)
  })
})

describe('seed/grading.json', () => {
  it('matches the Faculty handbook scale', () => {
    expect(grading.grades.map((g) => [g.letter, g.min, g.max, g.point])).toEqual([
      ['A', 70, 100, 5],
      ['B', 60, 69, 4],
      ['C', 50, 59, 3],
      ['D', 45, 49, 2],
      ['E', 40, 44, 1],
      ['F', 0, 39, 0],
    ])
    expect(grading).toMatchObject({ active: true, passMark: 2.4, units: { min: 1, max: 3 } })
    expect(grading.bands).toEqual([
      { name: 'Pass', min: 2.4, max: 5 },
      { name: 'Fail', min: 0, max: 2.39 },
    ])
  })

  it('rejects a scale with a gap', async () => {
    const grades = [
      { letter: 'A', min: 50, max: 100, point: 5 },
      { letter: 'F', min: 0, max: 48, point: 0 },
    ]
    await expect(new GradingScaleModel({ ...grading, grades }).validate()).rejects.toThrow(
      /no gaps or overlaps/,
    )
    expect(
      coversRange(
        [
          { min: 0, max: 2.39 },
          { min: 2.4, max: 5 },
        ],
        0,
        5,
        0.01,
      ),
    ).toBe(true)
  })
})

describe('seed/settings.json', () => {
  it('has the four official social links over https and no personal contact details', async () => {
    expect(settings.socialLinks.map((s) => s.platform)).toEqual([
      'Instagram',
      'X',
      'YouTube',
      'LinkedIn',
    ])
    expect(JSON.stringify(settings)).not.toMatch(/\d{7,}|psln=/)
    expect(settings).toMatchObject({
      key: 'site',
      contactEmail: 'pansunilag@gmail.com',
      isPlaceholder: false,
    })
    await expect(new SettingsModel({ ...settings, key: 'other' }).validate()).rejects.toThrow(/key/)
  })
})
