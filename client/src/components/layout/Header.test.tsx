import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from '../../lib/theme.ts'
import { mockApi } from '../../test/mockApi.ts'
import { renderRoute } from '../../test/renderRoute.tsx'

afterEach(() => vi.unstubAllGlobals())

async function desktopNav() {
  return within(await screen.findByRole('navigation', { name: 'Main' }))
}

describe('desktop navigation', () => {
  it('shows the 8 menu items in order', async () => {
    renderRoute('/')
    const nav = await desktopNav()
    const labels = nav
      .getAllByRole('listitem')
      .filter((item) => item.parentElement?.parentElement?.tagName === 'NAV')
      .map((item) => item.firstElementChild?.textContent)
    expect(labels).toEqual(['About', 'Leadership', 'Events', 'Student Tools'])
  })

  it('opens a dropdown with Enter and closes it with Escape, returning focus', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const nav = await desktopNav()
    const about = nav.getByRole('button', { name: 'About' })

    about.focus()
    await user.keyboard('{Enter}')
    expect(about.getAttribute('aria-expanded')).toBe('true')
    expect(nav.getByRole('link', { name: /Who we are/ })).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(about.getAttribute('aria-expanded')).toBe('false')
    expect(nav.queryByRole('link', { name: /Who we are/ })).toBeNull()
    expect(document.activeElement).toBe(about)
  })

  it('can be used with the keyboard alone to reach a page', async () => {
    mockApi({
      '/api/executives': { session: '2026/2027', sessions: ['2026/2027'], executives: [] },
    })
    const user = userEvent.setup()
    renderRoute('/')
    const nav = await desktopNav()
    const leadership = nav.getByRole('button', { name: 'Leadership' })

    leadership.focus()
    await user.keyboard('{Enter}')
    await user.tab()
    expect(document.activeElement?.textContent).toContain('Executive Council')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Executive Council 2026/27' }),
    ).toBeTruthy()
    expect(leadership.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement?.id).toBe('main')
  })

  it('opens one dropdown at a time and closes on an outside click', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const nav = await desktopNav()
    const about = nav.getByRole('button', { name: 'About' })
    const events = nav.getByRole('button', { name: 'Events' })

    await user.click(about)
    await user.click(events)
    expect(about.getAttribute('aria-expanded')).toBe('false')
    expect(events.getAttribute('aria-expanded')).toBe('true')

    await user.click(document.getElementById('main')!)
    expect(events.getAttribute('aria-expanded')).toBe('false')
  })

  it('marks the current page and highlights its section', async () => {
    const user = userEvent.setup()
    renderRoute('/leadership/senate')
    const nav = await desktopNav()
    const leadership = nav.getByRole('button', { name: 'Leadership' })
    expect(leadership.className).toContain('text-text-brand')

    await user.click(leadership)
    expect(nav.getByRole('link', { name: /Senate/ }).getAttribute('aria-current')).toBe('page')
  })
})

describe('mobile menu', () => {
  it('opens and closes with the Menu button and Escape', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const button = await screen.findByRole('button', { name: 'Menu' })
    expect(button.getAttribute('aria-expanded')).toBe('false')

    await user.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(button.textContent).toBe('Close')
    expect(screen.getByRole('navigation', { name: 'Main menu' })).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('closes after choosing a page', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    const menu = within(screen.getByRole('navigation', { name: 'Main menu' }))

    await user.click(menu.getByRole('button', { name: 'Student Tools' }))
    await user.click(menu.getByRole('link', { name: 'CGPA calculator' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'CGPA calculator' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull()
  })

  it('opens the section of the current page', async () => {
    const user = userEvent.setup()
    renderRoute('/about/membership')
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    const menu = within(screen.getByRole('navigation', { name: 'Main menu' }))
    expect(menu.getByRole('button', { name: 'About' }).getAttribute('aria-expanded')).toBe('true')
    expect(
      menu.getByRole('link', { name: 'Membership & rights' }).getAttribute('aria-current'),
    ).toBe('page')
  })
})

describe('theme', () => {
  it('cycles System → Light → Dark → System and remembers the choice', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const toggle = await screen.findByRole('button', { name: /^Theme: System/ })

    await user.click(toggle)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: /^Theme: Light/ }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.click(screen.getByRole('button', { name: /^Theme: Dark/ }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('keeps the header toggle and the mobile menu choice in sync', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(screen.getByRole('button', { name: /^Theme: Dark/ })).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Dark' }) as HTMLInputElement).checked).toBe(true)
  })
})

describe('footer', () => {
  it('shows the full name, motto, address and the four social links', async () => {
    renderRoute('/')
    const footer = within(await screen.findByRole('contentinfo'))
    expect(
      footer.getByText('Pharmaceutical Association of Nigeria Students, University of Lagos'),
    ).toBeTruthy()
    expect(footer.getByText('Service to Humanity')).toBeTruthy()
    expect(footer.getByText(/PANS Unilag secretariat/i)).toBeTruthy()
    for (const name of ['Instagram', 'X', 'YouTube', 'LinkedIn']) {
      expect(footer.getByRole('link', { name }).getAttribute('href')).toMatch(/^https:\/\//)
    }
    expect(footer.getByRole('link', { name: 'Privacy notice' }).getAttribute('href')).toBe(
      '/connect/privacy',
    )
  })
})
