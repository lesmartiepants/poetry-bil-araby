# wouter — API (harvested from official README)

## Hooks

### useRoute(pattern)

Returns `[match, params]`.

- `match`: boolean — whether the current location matches `pattern`.
- `params`: object of matched named params, or `null` when there is no match.
  Example: `const [match, params] = useRoute("/users/:id")`.

### useLocation()

Returns `[location, navigate]`.

- `location`: current path string (relative to the router `base`).
- `navigate(path, options?)`: navigates. `options` accepts `{ replace: true }`
  to replace history instead of pushing, and arbitrary `state`.
  Note: `useLocation` respects router config (base, nesting, custom hook). It is
  NOT the same as `useBrowserLocation`.

### useParams()

No args. Returns the params object of the CLOSEST parent `<Route>`. It does not
merge params from ancestor routes — only the nearest one.

### useSearch()

No args. Returns the query string WITHOUT the leading `?`. Re-renders only when
the search string changes. (There is no `useSearchParams` hook in wouter.)

### useRouter()

No args. Returns the active router object (base, parser, hooks). Used to read or
build on router configuration.

## Components

### <Route path={pattern} component={C} /> OR children

Two forms:

- `<Route path="/users/:id" component={User} />`
- Render-prop children for matched params:
  `<Route path="/users/:id">{params => <User id={params.id} />}</Route>`
  A pathless `<Route>` is always active (useful as a fallback).

### <Link href="..." />

Renders an `<a>`. Props:

- `className` can be a function receiving `{ isActive }`-style active boolean,
  for active-link styling (wouter has no dedicated `NavLink`).
- `asChild` lets a custom child element render the `<a>` (so you can pass your
  own `onClick`, styling, etc.).

### <Switch>

Renders only the FIRST matching child `<Route>`. Child ORDER matters. A pathless
fallback `<Route>` must come LAST, since it always matches.

### <Redirect to="..." />

Imperatively redirects on render.

### <Router />

Top-level config wrapper. Props:

- `base: string` — base path; `useLocation()` then returns paths relative to it
  (e.g. with `base="/app"`, visiting `/app/users` yields location `/users`).
- `hook: () => [location, setLocation]` — custom location source (hash, memory,
  SSR, etc.).
- `parser` — custom path parser; needed for strict (trailing-slash-sensitive)
  matching, which wouter does not do by default.
- `hrefs: (href) => href` — transform hrefs (e.g. for hash routing).

## Route pattern matching

| Pattern                     | Matches                                                                     |
| --------------------------- | --------------------------------------------------------------------------- |
| `/app/:page`                | named param → `params.page`                                                 |
| `/app/:page/:section`       | multiple named params                                                       |
| `/:locale?/home`            | optional param — matches `/en/home` and `/home`                             |
| `/movies/:title.(mp4\|mov)` | regex-constrained segment                                                   |
| `/app*`                     | wildcard — matches `/app`, `/app-1`, `/app/home`                            |
| `/orders/*?`                | optional wildcard — matches `/orders`, `/orders/`, `/orders/completed/list` |

## Gotchas / differences from react-router

- No built-in `useRoutes` / route-object config (components only).
- No animated-transition support out of the box — animate by manually matching
  with `useRoute` and driving your own transition.
- Active-link styling is a `className` function, not a `NavLink` component.
- `useParams` reads only the closest parent route's params.
- `useSearch` strips the leading `?` and re-renders only on search change.
- Strict (trailing-slash) matching requires a custom `parser`.
- Requires ES2019+; TypeScript ≥ 4.1 for route param type inference.
