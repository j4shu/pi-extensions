# pi-rename-session

A [pi](https://pi.dev) extension that auto-names a new session from its first
exchange.

| Command                      | Action                               |
| ---------------------------- | ------------------------------------ |
| `/rename-session`            | Regenerate the session name manually |
| `/rename-session on` / `off` | Toggle auto-naming                   |
| `/rename-session status`     | Show enabled state, name, config     |

Note: Auto-naming only fires on genuinely fresh sessions (no prior user messages,
no existing name).

## Config

`~/.pi/agent/pi-rename-session.json`:

```json
{
  "enabled": true,
  "model": "openai/gpt-x"
}
```

| Key       | Meaning                                                                   |
| --------- | ------------------------------------------------------------------------- |
| `enabled` | Auto-naming on/off. Default `true`.                                       |
| `model`   | Naming model override as `provider/id`. Default: the session's own model. |

## Development

```sh
npm install
npm run typecheck
npm test
```
