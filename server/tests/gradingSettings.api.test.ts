import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { buildOpenApiDocument } from '../src/docs/openapi.js'
import { testApp } from './helpers.js'

const readme = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8')
const cgpaSection = readme.slice(
  readme.indexOf('## CGPA calculator'),
  readme.indexOf('### Academic standing'),
)

/** Table rows like "| 70–100 | A | 5 |" or "| 2.40–5.00 | **Pass** |" from the README's CGPA section. */
function tableRows(pattern: RegExp) {
  return [...cgpaSection.matchAll(pattern)].map((m) => m.slice(1))
}

describe('GET /api/grading-scale', () => {
  it('matches the grade table in the README exactly', async () => {
    const res = await request(testApp()).get('/api/grading-scale')
    const readmeGrades = tableRows(/^\| (\d+)–(\d+) \| ([A-F]) \| (\d) \|$/gm).map(
      ([min, max, letter, point]) => ({
        letter,
        min: Number(min),
        max: Number(max),
        point: Number(point),
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    expect(readmeGrades).toHaveLength(6)
    expect(res.body.grades).toEqual(readmeGrades)
  })

  it('matches the README Pass/Fail bands, pass mark and unit limits', async () => {
    const { body } = await request(testApp()).get('/api/grading-scale')
    const readmeBands = tableRows(/^\| (\d\.\d\d)–(\d\.\d\d) \| \*\*(\w+)\*\* \|$/gm).map(
      ([min, max, name]) => ({ name, min: Number(min), max: Number(max) }),
    )

    expect(readmeBands).toHaveLength(2)
    expect(body.bands).toEqual(readmeBands)
    expect(body.passMark).toBe(2.4)
    expect(cgpaSection).toContain('each course is 1–3 units')
    expect(body.units).toEqual({ min: 1, max: 3 })
    expect(body).toMatchObject({ slug: 'faculty-of-pharmacy-5-point', isPlaceholder: false })
    expect(body.source).toMatch(/handbook, §3\.5/)
    expect(body).not.toHaveProperty('active')
  })

  it('returns 404 when no scale is active', async () => {
    const res = await request(
      testApp({ readers: { gradingScale: { findActive: async () => null } } }),
    ).get('/api/grading-scale')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'No active grading scale' })
  })
})

describe('GET /api/settings', () => {
  it('returns contact details and the four social links', async () => {
    const res = await request(testApp()).get('/api/settings')

    expect(res.status).toBe(200)
    expect(res.body.postalAddress).toContain('PANS Unilag secretariat')
    expect(res.body.socialLinks.map((l: { platform: string }) => l.platform)).toEqual([
      'Instagram',
      'X',
      'YouTube',
      'LinkedIn',
    ])
    expect(res.body).toMatchObject({
      contactEmail: 'pansunilag@gmail.com',
      quickLinks: [],
      homeBanner: null,
      isPlaceholder: false,
    })
    expect(res.body).not.toHaveProperty('key')
    expect(res.body).not.toHaveProperty('_id')
  })

  it('returns the banner only when it has text', async () => {
    const withBanner = testApp({
      readers: {
        settings: {
          find: async () => ({
            postalAddress: 'Lagos',
            homeBanner: {
              text: ' Freshers’ Week starts 30 Nov ',
              url: '/events/freshers-week-2026',
            },
          }),
        },
      },
    })
    expect((await request(withBanner).get('/api/settings')).body.homeBanner).toEqual({
      text: 'Freshers’ Week starts 30 Nov',
      url: '/events/freshers-week-2026',
    })
  })

  it('returns 404 before the settings are seeded', async () => {
    const res = await request(testApp({ readers: { settings: { find: async () => null } } })).get(
      '/api/settings',
    )
    expect(res.status).toBe(404)
  })

  it('documents both routes', () => {
    const paths = buildOpenApiDocument().paths ?? {}
    expect(paths['/api/grading-scale']?.get?.operationId).toBe('getGradingScale')
    expect(paths['/api/settings']?.get?.operationId).toBe('getSettings')
  })
})
