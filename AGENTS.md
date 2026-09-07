# pi-extensions

Repo conventions and release procedure. User-facing overview lives in
README.md.

## Layout

- `pi-quicksave/`, `pi-rename-session/` — self-contained pi extension packages,
  each with own `package.json`, lockfile, and tests. No root install or npm
  workspaces.

## Development

Per package: `cd <package>` then `npm ci`, `npm run check`, `npm test`. CI runs
both packages' checks on push/PR. Local dev installs in
`~/.pi/agent/settings.json` point at `pi-extensions/{pi-quicksave,pi-rename-session}`.

## Releasing

Manual per package: GitHub Actions tab > `release` workflow > pick package
(`pi-quicksave` or `pi-rename-session`) and bump. The workflow runs checks,
bumps the version via `npm version`, tags it `vX.Y.Z`, and publishes to npm via
trusted publishing (OIDC, no tokens).

Facts that matter:

- Packages keep separate npm identities under the `@j4shu/` scope: `@j4shu/pi-quicksave`,
  `@j4shu/pi-rename-session`. Versions and tags are independent per package.
- The old unscoped `pi-quicksave` was unpublished. If a name is taken (as
  `pi-rename-session` was by another author), publish under `@j4shu/` or pick a
  free name.
- First publish of any new package must run from a machine logged into npm
  (`npm adduser`) with `npm publish --access public`; trusted publishing only
  works once the package exists. Register it afterwards in npmjs.com Access tab
  (repo `j4shu/pi-extensions`, workflow `release.yml`, allow `npm publish`).
- Trusted publisher bindings are repo-path-specific: renaming the GitHub repo
  breaks publishes until the npmjs.com binding is re-pointed.
- Tags: shared namespace across packages in this repo, so versions must not
  collide. `pi-rename-session` started at `1.0.0` for this reason.
