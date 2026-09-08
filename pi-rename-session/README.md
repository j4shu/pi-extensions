# pi-rename-session

A [pi](https://pi.dev) extension that auto-names a new session from its first exchange.

| Command                  | Action                               |
| ------------------------ | ------------------------------------ |
| `/rename-session`        | Regenerate the session name manually |
| `/rename-session status` | Show name, arming status             |

Auto-naming only fires on new sessions.

## Configuration

Auto-naming is always on while the extension is installed. Uninstall to disable it.

## Install

```sh
pi install npm:@j4shu/pi-rename-session
```

## Development

```sh
npm install
npm run check
npm test
```
