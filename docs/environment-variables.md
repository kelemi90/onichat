# Environment variables

Create a `.env` file on the Proxmox host next to `docker-compose.yml`; do not commit it and do not prefix Twitch secrets with `VITE_`, because Vite variables are eligible for browser exposure.

| Variable | Required | Purpose |
|---|---:|---|
| `TWITCH_CLIENT_ID` | Yes for Twitch badge images | Twitch Developer application client ID used to query global and channel badge metadata. |
| `TWITCH_CLIENT_SECRET` | No | Optional Twitch application secret used when refreshing OAuth tokens. Keep it server-side. |
| `TWITCH_BOT_USERNAME` | Yes for live mode | Twitch account username used by the IRC relay. |
| `TWITCH_OAUTH_TOKEN` | Yes for live mode unless using automatic refresh | OAuth access token for the bot account. Remove the `oauth:` prefix if you prefer; the relay accepts either form. |
| `TWITCH_REFRESH_TOKEN` | No | Refresh token for the bot account. When set with `TWITCH_CLIENT_ID`, the relay refreshes its access token automatically and saves Twitch's rotated refresh token. Token variables are only passed to the relay container. |
| `TWITCH_REFRESH_TOKEN_FILE` | No | Path used to persist the latest refresh token. Docker Compose defaults to `/var/lib/oni-chat-relay/refresh-token` in a persistent named volume; outside Compose the default is `/tmp/oni-chat-relay/refresh-token`. |
| `TWITCH_CHANNEL` | Yes for live mode | Channel joined by the relay, without the leading `#`. |
| `RELAY_PORT` | No | Internal relay port; defaults to `8787`. |
| `RELAY_MAX_CLIENTS` | No | Maximum simultaneous overlay connections; defaults to `100`. |
| `RELAY_ALLOWED_ORIGINS` | Yes for live mode | Comma-separated exact browser origins allowed to open the relay, for example `https://oni.laiki.fi`. Local development can use `http://localhost:3000`. The relay rejects missing or unlisted origins. |

Demo mode does not require Twitch credentials or a relay connection. Generate a URL with `demo=true` while the Twitch values are absent or before the bot account is ready. For live mode, set `RELAY_ALLOWED_ORIGINS` explicitly; do not use a wildcard origin.
