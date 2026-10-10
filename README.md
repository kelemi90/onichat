# Oni Chat Overlay

A transparent, cinematic neon-noir Twitch chat overlay designed for OBS Browser Source. The project contains a React control room, a credential-free demo mode, and an always-on Node relay that keeps Twitch credentials outside the browser.

For a clean deployment with your own Twitch bot, channel, domain, OAuth token, Docker host, and OBS settings, start with [docs/clean-install.md](docs/clean-install.md).

## Architecture

The system uses two containers. The `web` container serves the React application and control room on port `3000`. The `relay` container connects to Twitch IRC over a secure WebSocket on port `443`, parses chat messages, and broadcasts normalized JSON messages over its internal port `8787`. A reverse proxy should expose the web service publicly and route `/ws/chat` to the relay service, preserving WebSocket upgrades.

The browser never receives the Twitch OAuth token. It receives only normalized chat messages from the relay. The relay is intentionally configured for one Twitch channel per deployment, which keeps the runtime predictable and avoids allowing arbitrary channel joins from public URLs.

## Local development

Install dependencies with `pnpm install`, then run `pnpm dev`. Open the local control room and use **Open overlay preview** or open `/overlay?demo=true` directly. Demo mode is entirely local and requires no Twitch credentials.

Run `pnpm check` for TypeScript validation, `pnpm test` for unit tests, and `pnpm build` for the production build. The build produces the web server bundle in `dist/` and the relay bundle in `dist/relay/`.

## Twitch setup

The relay uses Twitch IRC, so it needs a **User Access Token** with the IRC scopes `chat:read` and `chat:edit`, plus a **Refresh Token** to renew access automatically. The bot's Twitch password is never needed.

1. Create a Twitch application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Install the [Twitch CLI](https://dev.twitch.tv/docs/cli/) and run `twitch configure`; enter this application's Client ID and secret at its prompts. This must be the same application whose Client ID is set as `TWITCH_CLIENT_ID`.
2. Log in as the Twitch account that should act as the bot, then run:

   ```bash
   twitch token --user-token --dcf --scopes "chat:read chat:edit"
   ```

   Approve the request in Twitch. The CLI prints a **User Access Token**, **Refresh Token**, expiration, and scopes. Use the user access token—not the refresh token—for `TWITCH_OAUTH_TOKEN`. The account that authorized the request must match `TWITCH_BOT_USERNAME` (its lowercase Twitch login). `TWITCH_CHANNEL` is the channel to join and can be a different account.
3. Put the credentials in the host `.env` file beside `docker-compose.yml`, with restrictive permissions. For example:

   ```dotenv
   TWITCH_CLIENT_ID=your_application_client_id
   TWITCH_CLIENT_SECRET=your_application_client_secret
   TWITCH_BOT_USERNAME=bot_account_login
   TWITCH_CHANNEL=channel_to_join
   TWITCH_OAUTH_TOKEN=the_user_access_token
   TWITCH_REFRESH_TOKEN=the_refresh_token
   ```

   Keep the client secret and tokens private. Do not commit `.env`, paste credentials into chat/issues, or place them in frontend code, URLs, browser storage, or variables prefixed with `VITE_`. The relay accepts an optional `oauth:` prefix on the access token.
4. You can validate the access token without echoing it to the terminal:

   ```bash
   read -r -s -p "Twitch access token: " TWITCH_TOKEN; printf '\n'
   printf 'header = "Authorization: OAuth %s"\n' "$TWITCH_TOKEN" |
     curl -sS --config - https://id.twitch.tv/oauth2/validate
   unset TWITCH_TOKEN
   ```

   Confirm the response's `login` matches `TWITCH_BOT_USERNAME`, `client_id` matches `TWITCH_CLIENT_ID`, and `scopes` include `chat:read` (and `chat:edit` for IRC sending). Never validate or use the refresh token as an access token.
5. Start or recreate the relay so it reads the current `.env`:

   ```bash
   docker compose up -d --force-recreate relay
   docker compose logs --tail=50 relay
   ```

   A successful connection logs `joined #...`. The relay refreshes the access token before it expires and saves Twitch's rotated refresh token in the persistent `relay-token-data` Docker volume. The saved token takes precedence over `TWITCH_REFRESH_TOKEN` on future starts. If replacing credentials, enter the new refresh token into that volume as well:

   ```bash
   read -r -s -p "New Twitch refresh token: " TWITCH_REFRESH_TOKEN; printf '\n'
   printf '%s\n' "$TWITCH_REFRESH_TOKEN" |
     docker compose exec -T relay sh -c 'umask 077; cat > /var/lib/oni-chat-relay/refresh-token'
   unset TWITCH_REFRESH_TOKEN
   docker compose restart relay
   ```

   If IRC reports `Login unsuccessful`, validate the **access** token and check its account login against `TWITCH_BOT_USERNAME`. A successful refresh or badge lookup alone does not prove the IRC login is correct.

The relay joins Twitch using IRC over TLS, responds to server `PING` frames, requests Twitch tags and emote metadata, and reconnects with exponential backoff after network failures. The `/health` endpoint reports whether the relay is currently connected.

## Proxmox deployment with Docker Compose

Create a small Debian or Ubuntu VM or LXC with Docker Engine and the Compose plugin. Clone or copy this project to a persistent directory, create a `.env` file beside `docker-compose.yml`, and fill in the live Twitch variables. Then run:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f relay
```

The web service is published on `127.0.0.1:3000` and the relay on `127.0.0.1:8787`; neither is exposed directly to the internet. Set `RELAY_ALLOWED_ORIGINS=https://chat.laiki.fi` in `.env` before starting live mode. Keep the relay internal to the host/reverse-proxy boundary and do not publish it on `0.0.0.0`.

## Reverse proxy guidance

For your public domain, terminate TLS at an existing reverse proxy such as Caddy, Nginx Proxy Manager, or Traefik. Route ordinary HTTPS requests to the `web` service on port `3000` and route WebSocket requests for `/ws/chat` to the `relay` service on port `8787`. WebSocket upgrade headers must be preserved. A Caddy-style equivalent is:

```caddy
chat.example.com {
  reverse_proxy /ws/chat relay:8787
  reverse_proxy web:3000
}
```

If the proxy runs outside Docker, point it at the loopback ports shown above. If the proxy runs as another container, use a private Docker network or a tightly controlled host gateway route. Do not expose `8787` directly to the internet. See `SECURITY.md` for the threat model and operational checklist.

## OBS Browser Source

Add a Browser Source with the generated URL from the control room. Enable a transparent background by leaving the overlay page background transparent, set the Browser Source dimensions to match the stream canvas, and disable any browser custom CSS that adds a background or scrollbar. Use `1920x1080`, `2560x1440`, or `1080x1920` according to the scene. Demo preview can be opened with `demo=true`; live URLs omit that flag and should include the channel parameter.

The URL supports settings such as `duration`, `maxMessages`, `fontSize`, `width`, `animation`, `speed`, `theme`, `accent`, `badges`, `timestamps`, `usernames`, `emotes`, and `compact`. Example:

```text
https://chat.example.com/overlay?channel=your_channel&duration=8&maxMessages=8&fontSize=18&theme=oni&accent=magenta
```

## Adding themes

Theme definitions are expressed through the CSS variables on `.overlay-shell`. Add a new theme class, set its `--pink` and `--cyan` values, and add the theme name to `ALLOWED_THEMES` in `shared/chat.ts`. The rendering components do not need to change because theme logic remains separate from message and relay logic.

## Animation customization

The `ChatMessage` component applies animation classes and only transitions opacity and transform. Add a class in `client/src/index.css`, then add its name to `ALLOWED_ANIMATIONS`. Keep motion subtle for gameplay readability and preserve the reduced-motion media query. Avoid animating layout properties such as height, width, padding, or margin during normal message entry.

## Troubleshooting

If the overlay says `Add a channel in the control room`, the generated URL does not include a channel. If it shows `Relay connection error`, inspect `docker compose logs relay` and confirm that the Twitch token, username, and channel are valid. If the relay reports a channel mismatch, the URL channel must match `TWITCH_CHANNEL`. If OBS shows a dark rectangle, check that the Browser Source page is the `/overlay` route and that no custom background CSS is applied.
