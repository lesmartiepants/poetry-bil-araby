# Google Auth branding audit (free tier)

This change does not modify Google Cloud, Supabase, Vercel, or production. It audits the
public app identity and records the free Google Auth Platform values that should match it.

## Recommended Branding fields

| Google Auth Platform field | Recommended value                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------ |
| App name                   | `Poetry Bil-Araby`                                                                   |
| App logo                   | The existing gold quill PWA icon, exported to Google's required square raster format |
| App home page              | `https://poetry-bil-araby.vercel.app/`                                               |
| Privacy policy             | `https://poetry-bil-araby.vercel.app/privacy.html` after this PR is deployed         |
| Terms of service           | `https://poetry-bil-araby.vercel.app/terms.html` after this PR is deployed           |
| Developer contact          | A monitored project-owner address; do not expose it in repository files              |

The name, quill, lapis-and-gold palette, and reader-focused language match the live product,
README banner, splash screen, PWA metadata, and new auth return surface. Google should request
only the basic identity scopes already used by the application (`openid`, `email`, `profile`).

## Safe rollout

1. Merge and deploy this PR so both legal URLs return real public pages.
2. In Google Auth Platform, compare the existing fields with the table above. Do not rotate
   the client ID or secret and do not change callback URIs as part of branding.
3. Upload the existing quill icon only if it meets Google's current image requirements.
4. Save the branding draft, complete any free brand verification Google requests, and publish
   only after a human confirms the public consent preview belongs to Poetry Bil-Araby.
5. Test account selection, consent, cancellation, callback, retry, signed-in state, and logout;
   confirm Nemo branding never appears.

Official references:

- [Google OAuth production readiness and brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
- [Google Sign-In branding guidelines](https://developers.google.com/identity/branding-guidelines)
- [Google Auth Platform branding configuration](https://support.google.com/cloud/answer/15549049)

## Deliberate boundary

The Google Console's current private field values were not copied into this repository or tool
output. A final read-only Console comparison and any publish action remain a human review step;
this PR provides the public URLs and product assets needed to complete it safely.
