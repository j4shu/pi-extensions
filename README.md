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
pi install npm:pi-quicksave
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
