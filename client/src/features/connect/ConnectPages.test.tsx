import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiError, jsonResponse, mockApi } from '../../test/mockApi.ts'
import { renderRoute } from '../../test/renderRoute.tsx'
import pagesJson from '../../../../server/seed/pages.json?raw'
import settingsJson from '../../../../server/seed/settings.json?raw'

afterEach(() => vi.unstubAllGlobals())

const main = () => document.getElementById('main')!
const received = () => jsonResponse(201, { received: true })

/** The JSON bodies POSTed to a path. */
const posted = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  // mockApi types fetch with one argument; the client passes (url, init).
  (fetchMock.mock.calls as unknown as [RequestInfo | URL, RequestInit | undefined][])
    .filter(([input, init]) => String(input).endsWith(path) && init?.method === 'POST')
    .map(([, init]) => JSON.parse(String(init!.body)) as Record<string, unknown>)

describe('Feedback form', () => {
  it('lists every problem in a focused summary linked to the fields', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ '/api/feedback': received })
    renderRoute('/connect/feedback')
    await user.click(await screen.findByRole('button', { name: 'Send message' }))

    const summary = screen.getByRole('alert')
    expect(document.activeElement).toBe(summary)
    expect(within(summary).getByRole('heading', { name: 'Please check the form' })).toBeTruthy()
    const links = within(summary).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#category', '#message'])
    expect(links[1]!.textContent).toBe('Your message: Please write at least 10 characters.')

    const message = screen.getByLabelText('Your message')
    expect(message.getAttribute('aria-invalid')).toBe('true')
    expect(message.getAttribute('aria-describedby')).toBe('message-hint message-error')
    expect(document.getElementById('message-error')!.textContent).toContain(
      'Please write at least 10 characters.',
    )
    expect(
      screen.getByRole('group', { name: 'What it’s about' }).getAttribute('aria-invalid'),
    ).toBe('true')
    expect(posted(fetchMock, '/api/feedback')).toHaveLength(0)
  })

  it('sends anonymously by default and says who reads it', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ '/api/feedback': received })
    renderRoute('/connect/feedback')
    expect(await within(main()).findByText(/the Secretary General/)).toBeTruthy()
    expect(
      within(main()).getByText(/Welfare issues are passed to the Welfare Secretary/),
    ).toBeTruthy()

    await user.click(screen.getByRole('radio', { name: 'A welfare issue' }))
    expect(within(main()).getByText('This will reach the Welfare Secretary.')).toBeTruthy()
    await user.type(
      screen.getByLabelText('Your message'),
      '  The hostel water supply is unreliable.  ',
    )
    expect(screen.getByRole('checkbox', { name: 'Send anonymously' })).toHaveProperty(
      'checked',
      true,
    )
    expect(screen.queryByLabelText('Your email')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    const status = await within(screen.getByRole('main')).findByRole('status')
    expect(within(status).getByRole('heading', { name: /your message was sent/ })).toBe(
      document.activeElement,
    )
    expect(within(status).getByText(/sent it anonymously/)).toBeTruthy()
    expect(within(status).getByText(/It will reach the Welfare Secretary/)).toBeTruthy()
    expect(posted(fetchMock, '/api/feedback')).toEqual([
      { category: 'welfare', message: 'The hostel water supply is unreliable.' },
    ])

    await user.click(within(status).getByRole('button', { name: 'Send another message' }))
    expect(screen.getByLabelText('Your message')).toHaveProperty('value', '')
  })

  it('asks for a valid email when the student chooses to leave one', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ '/api/feedback': received })
    renderRoute('/connect/feedback')
    await user.click(await screen.findByRole('radio', { name: 'A suggestion' }))
    await user.type(screen.getByLabelText('Your message'), 'Share Pharmathon results online.')
    await user.click(screen.getByRole('checkbox', { name: 'Send anonymously' }))
    await user.type(screen.getByLabelText('Your email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    expect(within(screen.getByRole('alert')).getByRole('link').getAttribute('href')).toBe(
      '#contactEmail',
    )

    await user.clear(screen.getByLabelText('Your email'))
    await user.type(screen.getByLabelText('Your email'), 'tolu@example.com')
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    await within(screen.getByRole('main')).findByRole('status')
    expect(posted(fetchMock, '/api/feedback')[0]).toEqual({
      category: 'suggestion',
      message: 'Share Pharmathon results online.',
      contactEmail: 'tolu@example.com',
    })
  })

  it('shows the server’s field errors and a clear message when rate-limited', async () => {
    const user = userEvent.setup()
    let call = 0
    mockApi({
      '/api/feedback': () =>
        ++call === 1
          ? jsonResponse(400, {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request',
                details: [{ location: 'body', path: 'message', message: 'Too spammy' }],
                requestId: 'r1',
              },
            })
          : jsonResponse(429, apiError('RATE_LIMITED', 'Too many requests')),
    })
    renderRoute('/connect/feedback')
    await user.click(await screen.findByRole('radio', { name: 'Something else' }))
    await user.type(screen.getByLabelText('Your message'), 'A message that is long enough.')
    await user.click(screen.getByRole('button', { name: 'Send message' }))
    expect(
      await within(await screen.findByRole('alert')).findByText('Your message: Too spammy'),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Send message' }))
    const alert = await screen.findByRole('alert')
    expect(await within(alert).findByText(/Please wait an hour and try again/)).toBeTruthy()
    expect(within(alert).getByRole('heading', { name: 'Your message wasn’t sent' })).toBeTruthy()
  })

  it('hides the spam trap from people and screen readers', async () => {
    mockApi({ '/api/feedback': received })
    renderRoute('/connect/feedback')
    await screen.findByRole('button', { name: 'Send message' })
    const trap = document.getElementById('website') as HTMLInputElement
    expect(trap.tabIndex).toBe(-1)
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Leave this empty' })).toBeNull()
  })
})

describe('Alumni form', () => {
  it('requires consent and checks each field', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ '/api/alumni': received })
    renderRoute('/connect/alumni')
    await user.type(await screen.findByLabelText('Year you graduated'), '2999')
    await user.type(screen.getByLabelText('Phone number (optional)'), 'call me')
    await user.click(screen.getByRole('button', { name: 'Join the network' }))

    const summary = screen.getByRole('alert')
    expect(document.activeElement).toBe(summary)
    expect(
      within(summary)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(['#name', '#graduationYear', '#email', '#phone', '#consent'])
    expect(
      within(summary).getByText('Year you graduated: Graduation year cannot be in the future.'),
    ).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /I agree/ }).getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(posted(fetchMock, '/api/alumni')).toHaveLength(0)
  })

  it('sends the details with consent and welcomes the alumnus', async () => {
    const user = userEvent.setup()
    const fetchMock = mockApi({ '/api/alumni': received })
    renderRoute('/connect/alumni')
    expect(
      await within(main()).findByRole('link', { name: 'Alumni Network Committee' }),
    ).toBeTruthy()
    await user.type(screen.getByLabelText('Full name'), ' Ada Okafor ')
    await user.type(screen.getByLabelText('Year you graduated'), '2019')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('checkbox', { name: 'Speaking at events' }))
    await user.click(screen.getByRole('checkbox', { name: 'Mentoring students' }))
    await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
    await user.click(screen.getByRole('button', { name: 'Join the network' }))

    const status = await within(screen.getByRole('main')).findByRole('status')
    expect(within(status).getByText(/Thank you, Ada\./)).toBeTruthy()
    expect(posted(fetchMock, '/api/alumni')).toEqual([
      {
        name: 'Ada Okafor',
        graduationYear: 2019,
        email: 'ada@example.com',
        interests: ['mentoring', 'speaking'],
        consent: true,
      },
    ])
  })
})

describe('Contact', () => {
  const page = (JSON.parse(pagesJson) as { slug: string }[]).find((p) => p.slug === 'contact')!
  const [settings] = JSON.parse(settingsJson) as Record<string, unknown>[]

  it('shows the postal address, location and social media', async () => {
    mockApi({
      '/api/pages/contact': { order: 0, isPlaceholder: false, ...page },
      '/api/settings': { quickLinks: [], homeBanner: null, ...settings },
    })
    renderRoute('/connect/contact')
    expect(await screen.findByRole('heading', { level: 2, name: 'Where to find us' })).toBeTruthy()
    expect(within(main()).getAllByText(/PANS Unilag secretariat/i).length).toBeGreaterThan(0)
    expect(within(main()).getAllByText(/idi araba, lagos/i).length).toBeGreaterThan(0)
    expect(
      within(main())
        .getByRole('link', { name: 'Get directions on Google Maps' })
        .getAttribute('href'),
    ).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=PANS/)
    expect(within(main()).getAllByText('pansunilag@gmail.com').length).toBeGreaterThan(0)
    expect(
      within(main()).getByRole('link', { name: 'PANS UNILAG on Instagram (opens in a new tab)' }),
    ).toBeTruthy()

    expect(main().textContent).not.toMatch(/(\+234|\b0[789][01])\d{8}/)
  })
})

describe('Privacy notice', () => {
  it('covers each form: what, who, how long, and how to be removed', async () => {
    renderRoute('/connect/privacy')
    expect(
      within(main())
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      'Browsing the website',
      'Feedback and suggestions',
      'Alumni network',
      'Keeping it safe',
      'Your rights',
    ])
    expect(within(main()).getByText(/messages are deleted after 12 months/)).toBeTruthy()
    expect(within(main()).getByText(/until you ask to be removed/)).toBeTruthy()
    expect(within(main()).getByText(/the Alumni Network Committee and PANS admins/)).toBeTruthy()
  })
})
