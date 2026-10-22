import { Link } from 'react-router'
import badgeUrl from '../../assets/pans-badge.png'
import { SITE } from '../../lib/site.ts'
import { Container } from './Container.tsx'

const FOOTER_LINKS = [
  { label: 'Contact', to: '/connect/contact' },
  { label: 'Feedback', to: '/connect/feedback' },
  { label: 'Constitution', to: '/governance/constitution' },
  { label: 'Privacy notice', to: '/connect/privacy' },
]

/** Navy footer on every public page. Navy and white work in both themes, so it doesn't switch. */
export function Footer() {
  return (
    <footer className="bg-navy text-on-primary [--color-focus:var(--color-accent)]">
      <Container className="flex flex-col gap-8 pt-12 pb-6">
        <div className="flex flex-wrap gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white">
                <img src={badgeUrl} alt="" width={50} height={50} className="size-[50px]" />
              </span>
              <p className="font-heading text-[17px] leading-snug font-semibold">{SITE.name}</p>
            </div>
            <p className="font-heading text-xl font-medium text-accent">{SITE.motto}</p>
          </div>

          <div className="flex min-w-0 flex-[1_1_15rem] flex-col gap-2">
            <h2 className="font-heading text-base font-medium">Write to us</h2>
            <address className="not-italic">
              {SITE.postalAddress.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <p className="text-small pt-1">
              Email:{' '}
              <a href="mailto:pansunilag@gmail.com" className="underline hover:text-accent">
                pansunilag@gmail.com
              </a>
            </p>
            <p className="text-small text-accent font-medium pt-1">
              For sponsorship and partnership write to{' '}
              <a href="mailto:pansunilag@gmail.com" className="underline hover:text-white">
                pansunilag@gmail.com
              </a>
            </p>
          </div>

          <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-2">
            <h2 className="font-heading text-base font-medium">Follow PANS UNILAG</h2>
            <ul className="flex flex-wrap gap-2">
              {SITE.socialLinks.map((link) => (
                <li key={link.platform}>
                  <a
                    href={link.url}
                    className="inline-flex min-h-10 items-center rounded-full border border-white px-3.5 text-small font-medium text-white no-underline hover:bg-white hover:text-navy"
                  >
                    {link.platform}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Footer" className="min-w-0 flex-[1_1_10rem]">
            <ul className="flex flex-col gap-1">
              {FOOTER_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="inline-flex min-h-8 items-center text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="border-t border-white pt-5 text-small">
          © {new Date().getFullYear()} {SITE.shortName}. Faculty of Pharmacy, University of Lagos.
        </p>
      </Container>
    </footer>
  )
}
