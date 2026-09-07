# pi-extensions

Monorepo of [pi](https://pi.dev) extensions by [j4shu](https://github.com/j4shu).

| Package | npm | What it does |
| ------- | --- | ------------ |
| [`packages/quicksave`](packages/quicksave) | `pi install npm:@j4shu/pi-quicksave` | Ctrl-s to quicksave the prompt, or browse saved prompts in a picker |
| [`packages/rename-session`](packages/rename-session) | `pi install npm:@j4shu/pi-rename-session` | Auto-name a new session from its first exchange |

## Development

Each package is self-contained (own `package.json`, lockfile, tests). No root
install or workspaces needed.

```sh
npm ci --prefix packages/quicksave
npm run check --prefix packages/quicksave
npm test --prefix packages/quicksave
```

or `cd packages/<name>` and run `npm ci`, `npm run check`, `npm test`.

## Releasing

Manual, per package, from the Actions tab: run the `release` workflow and pick
the package (`quicksave` or `rename-session`) and bump. The workflow checks,
bumps the version, tags it `vX.Y.Z`, publishes to npm via trusted publishing,
and creates a GitHub Release.

Note: separate packages keep separate npm identities, so versions and tags are
independent. Both publish under the `@j4shu/` scope. The old unscoped
`pi-quicksave` package is deprecated: existing installs keep working but get no
updates, so install the scoped package instead.

> First publish of each new scoped package runs from a machine logged into npm
> (`npm adduser`); the workflow's trusted publishing only works once the
> package exists.

> `rename-session` starts at `1.0.0` so its tags never collide with quicksave's
> existing `v0.1.x` tags in this repo's shared tag namespace.
