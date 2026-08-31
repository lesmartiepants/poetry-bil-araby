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

## In-app button compliance

Google's current guidance permits light, dark, and neutral button modes. Poetry Bil-Araby uses
the documented dark-mode provider button (`#131314` fill, `#8E918F` 1px stroke, `#E3E3E3`
text) with the standard multicolor G and “Continue with Google” wording. The gold foil is a
separate two-pixel product frame and glow around the provider button; it does not recolor the
Google button or logo. This keeps the original Poetry CTA character while preserving Google's
boundary, contrast, logo, and action text.

## Exact post-merge vendor checklist

### Google Auth Platform — branding-only review required

After the production deployment makes the new legal URLs public:

1. Open **Google Auth Platform → Branding** in the existing Poetry Google project.
2. Compare the fields with the table above. Add or correct only fields that differ—especially
   the Privacy Policy and Terms URLs—and use the existing Poetry quill for the app logo.
3. Preview the consent screen, verify it says Poetry Bil-Araby and never Nemo, then save/publish
   the branding or submit the free brand-verification review Google requests.

Do **not** create or rotate an OAuth client, reset its secret, change authorized JavaScript
origins, or change the Supabase callback URI for this rollout. Those values govern the existing
working login flow, not visual branding. Brand review can take a few business days, but the
application change does not depend on approval to function.

### Supabase Auth — no configuration change required

The app continues to call `signInWithOAuth({ provider: 'google' })` with the same PKCE flow and
production origin. Leave the existing Google provider client ID/secret, Site URL, callback, and
redirect allow list unchanged. Confirm them read-only during production QA; do not copy their
values into logs or tickets.

Adding a Supabase custom auth domain would improve the consent hostname but is paid and is
explicitly outside this free-only rollout. Generated Vercel Preview hosts are also not added to
OAuth redirect allow lists by this PR; production is the correct place for the real-account
callback check.

### Vercel — deployment and verification only

Merging to the production branch should publish the application, `/privacy.html`, and
`/terms.html` through the existing project. No environment variable, domain, project, or build
setting changes are required. Verify the deployment SHA, confirm all three URLs return `200`,
and perform the production auth dogfood below. Do not promote the current PR Preview as
Production manually.

## Safe rollout

1. Merge and deploy this PR so both legal URLs return real public pages.
2. In Google Auth Platform, compare the existing fields with the table above. Do not rotate
   the client ID or secret and do not change callback URIs as part of branding.
3. Upload the existing quill icon only if it meets Google's current image requirements.
4. Save the branding draft, complete any free brand verification Google requests, and publish
   only after a human confirms the public consent preview belongs to Poetry Bil-Araby.
5. Test account selection, consent, cancellation, callback, retry, signed-in state, and logout;
   confirm Nemo branding never appears.
6. Check browser, Vercel, and Supabase Auth logs for callback failures while confirming no
   authorization code, access token, refresh token, client secret, or user email is logged.

Official references:

- [Google OAuth production readiness and brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
- [Google Sign-In branding guidelines](https://developers.google.com/identity/branding-guidelines)
- [Google Auth Platform branding configuration](https://support.google.com/cloud/answer/15549049)

## Deliberate boundary

The Google Console's current private field values were not copied into this repository or tool
output. A final read-only Console comparison and any publish action remain a human review step;
this PR provides the public URLs and product assets needed to complete it safely.
