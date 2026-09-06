# pi-quicksave

A [pi](https://pi.dev) extension: quick-save your current prompt with a single
keyboard shortcut, then browse, fill, copy, edit, and delete entries in
Quicksaved Prompts from a keyboard-driven picker. Keyboard only, no slash
commands.

## Usage

One composer shortcut does double duty:

| Composer state | Ctrl-s |
| --- | --- |
| Non-empty prompt | Save the prompt text to the top of Quicksaved Prompts and clear the composer |
| Empty prompt | Open the prompt picker |

The cleared composer leaves the quicksaved prompt one Ctrl-s away: open the
picker, press Enter on the top entry, and your draft is back. No save
confirmation needed.

### In the picker

| Key | Action |
| --- | --- |
| `up` / `down`, `ctrl+n` / `ctrl+p` | Move selection (wraps) |
| `enter` | Fill the composer with the selected entry and close the picker |
| `ctrl+x` | Delete the selected entry. `enter` confirms, any other key cancels |
| `ctrl+y` | Copy the selected entry to the clipboard |
| `esc` | Close the picker without changing the composer |

## Storage

Quicksaved Prompts are stored in a plain JSON file at
`~/.pi/agent/quicksave.json`, shared across all sessions and projects. Newest
first, capped at 100 entries (oldest dropped, with a notice). Duplicate texts
are stored as separate entries.

## Install

```sh
pi install npm:pi-quicksave
# or from a checkout
pi install /path/to/pi-quicksave
# or for development, symlink so /reload picks up changes
ln -s /path/to/pi-quicksave ~/.pi/agent/extensions/pi-quicksave
```

## Development

```sh
npm install
npm run check   # typecheck
npm test        # Quicksaved Prompts logic tests
```

## Credits

Inspired by [pi-prompt-manager](https://github.com/Sreetej510/pi-extensions/tree/master/extensions/pi-prompt-manager)
and [pi-prompt-save](https://github.com/sids/pi-extensions/tree/main/prompt-save).
Both are MIT licensed; this project is MIT too.

## License

MIT
