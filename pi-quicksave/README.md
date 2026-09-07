# pi-quicksave

A [pi](https://pi.dev) extension to quicksave prompt inputs. Like Claude's `Ctrl-s`, but better.

| Prompt Input | Ctrl-s                             |
| ------------ | ---------------------------------- |
| Non-empty    | Quicksave the current prompt       |
| Empty        | Open the Quicksaved Prompts picker |

Picker keyboard shortcuts:

| Key                                | Action                    |
| ---------------------------------- | ------------------------- |
| `up` / `down`, `ctrl+n` / `ctrl+p` | Move                      |
| `enter`                            | Fill the prompt and close |
| `ctrl+x`                           | Delete (Enter confirms)   |
| `ctrl+y`                           | Copy to clipboard         |
| `esc`                              | Close                     |

Note: The picker shows entries newest first.

## Install

```sh
pi install npm:@j4shu/pi-quicksave
```

## Storage

Entries live in `~/.pi/agent/quicksave.json`, shared across sessions and
projects: newest first, capped at 100.

## Development

```sh
npm install
npm run check
npm test
```

## Releasing

Releases are manual so bugfixes can accumulate before publishing.

1. Push the fixes to `main`.
2. Run the `release` workflow in the monorepo (`j4shu/pi-extensions`): Actions tab > release > Run workflow, pick package `quicksave` and the bump (`patch`, `minor`, or `major`).
3. The workflow checks the code, bumps the version, tags it, and publishes to npm via
   trusted publishing.
