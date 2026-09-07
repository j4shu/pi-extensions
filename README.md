# pi-extensions

Monorepo of [pi](https://pi.dev) extensions by [j4shu](https://github.com/j4shu).

| Package | npm | What it does |
| ------- | --- | ------------ |
| [`packages/quicksave`](packages/quicksave) | `pi install npm:pi-quicksave` | Ctrl-s to quicksave the prompt, or browse saved prompts in a picker |
| [`packages/rename-session`](packages/rename-session) | not yet published | Auto-name a new session from its first exchange |

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
independent. npm-published installs (`pi install npm:pi-quicksave`) keep
working unchanged; only the source lives here now.

> `rename-session` is `private: true` in its `package.json`. To publish it
> later: drop `private`, confirm the npm name is free, then release via the
> workflow.
