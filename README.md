# pi-quicksave

A [pi](https://pi.dev) extension. One shortcut, two jobs:

| Composer state | Ctrl-s |
| --- | --- |
| Non-empty | Save the prompt to Quicksaved Prompts and clear the composer |
| Empty | Open the picker |

The picker shows entries newest first; press Enter to fill one back.

| Key | Action |
| --- | --- |
| `up` / `down`, `ctrl+n` / `ctrl+p` | Move (wraps) |
| `enter` | Fill the composer and close |
| `ctrl+x` | Delete (Enter confirms) |
| `ctrl+y` | Copy to clipboard |
| `esc` | Close |

Keyboard only, no slash commands.

## Install

```sh
pi install npm:pi-quicksave
```

From a checkout: `pi install /path/to/pi-quicksave`. For development, symlink
the checkout into `~/.pi/agent/extensions/pi-quicksave` so `/reload` picks up
changes.

## Storage

Entries live in `~/.pi/agent/quicksave.json`, shared across sessions and
projects: newest first, capped at 100 (oldest dropped with a notice),
duplicates kept as separate entries.

## Development

```sh
npm install
npm run check   # typecheck
npm test
```
