import { Link } from 'react-router'
import { navSection } from '../../../app/siteMap.ts'
import { PlaceholderText } from '../../../components/ui/Placeholder.tsx'
import { ContentPage } from '../../pages/components/ContentPage.tsx'
import { useContactSettings } from '../api/settings.ts'

const mapsUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`

/**
 * /connect/contact: postal address and correspondence (pages.json "contact", Art. 2), then where
 * the Secretariat is, the official email (pansunilag@gmail.com) and social media.
 */
export function ContactPage() {
  return (
    <ContentPage
      slug="contact"
      title="Contact"
      section={navSection('Connect')}
      after={<ContactDetails />}
    />
  )
}

function ContactDetails() {
  const settings = useContactSettings()
  const email = settings.contactEmail || 'pansunilag@gmail.com'

  return (
    <>
      <section aria-labelledby="location-title" className="flex flex-col gap-3">
        <h2 id="location-title" className="text-h3">
          Where to find us
        </h2>
        <p>{settings.location}</p>
        <p>
          <a href={mapsUrl(settings.location)} target="_blank" rel="noopener noreferrer">
            Get directions on Google Maps
          </a>{' '}
          <span className="text-small text-text-muted">(opens in a new tab)</span>
        </p>
      </section>

      <section aria-labelledby="online-title" className="flex flex-col gap-3">
        <h2 id="online-title" className="text-h3">
          Online
        </h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
          <dt className="font-heading font-medium text-text-muted">Email</dt>
          <dd>
            {email ? (
              <a href={`mailto:${email}`}>{email}</a>
            ) : (
              <PlaceholderText>Official email address coming soon</PlaceholderText>
            )}
          </dd>
          <dt className="font-heading font-medium text-text-muted">Messages</dt>
          <dd>
            Use the <Link to="/connect/feedback">feedback form</Link>. You can stay anonymous.
          </dd>
          <dt className="font-heading font-medium text-text-muted">Social media</dt>
          <dd>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {settings.socialLinks.map((s) => (
                <li key={s.platform}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`PANS UNILAG on ${s.platform} (opens in a new tab)`}
                  >
                    {s.platform}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </dl>
      </section>

      <section
        aria-labelledby="sponsorship-title"
        className="flex flex-col gap-3 rounded-2xl bg-surface-alt p-6 border border-border"
      >
        <h2 id="sponsorship-title" className="text-h3">
          Sponsorship & Partnership
        </h2>
        <p className="text-body leading-relaxed">
          For sponsorship, partnership, and collaborative initiatives with PANS UNILAG, please write
          directly to{' '}
          <a href={`mailto:${email}`} className="font-bold text-primary hover:underline">
            {email}
          </a>
          .
        </p>
      </section>
    </>
  )
}
