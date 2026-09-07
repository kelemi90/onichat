# Clean Installation Guide

This guide installs Oni Chat Overlay from a clean Debian or Ubuntu host. It assumes one Twitch channel per deployment, a dedicated Twitch bot account, Docker Compose, and an HTTPS hostname for the overlay.

Replace these values throughout the guide:

| Placeholder | Example | Meaning |
|---|---|---|
| `OVERLAY_DOMAIN` | `chat.example.com` | Public HTTPS hostname for the overlay |
| `BOT_USERNAME` | `my-overlay-bot` | Twitch account used by the relay |
| `CHANNEL_NAME` | `my_channel` | Twitch channel that the bot joins |
| `TWITCH_CLIENT_ID` | `abc123...` | Client ID from Twitch Developer Console |

## 1. Prepare the host

Use a Debian 12 or Ubuntu 24.04 VM with a stable IP address. A small deployment normally needs 1 vCPU, 1-2 GB RAM, and 8-16 GB of storage.

Install Docker and Git:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker version
docker compose version
```

Do not expose Docker ports directly to the internet. Use an HTTPS reverse proxy and keep ports `3000` and `8787` bound to loopback as provided by `docker-compose.yml`.

## 2. Install the project

Clone the repository into a persistent directory:

```bash
sudo mkdir -p /opt/oni-chat-overlay
sudo chown -R "$USER":"$USER" /opt/oni-chat-overlay
git clone https://github.com/kelemi90/onichat.git /opt/oni-chat-overlay
cd /opt/oni-chat-overlay
```

If the project was copied as an archive instead, confirm the project root contains `Dockerfile`, `docker-compose.yml`, `package.json`, and `patches/`.

## 3. Create your private settings

Create `.env` beside `docker-compose.yml` and keep it private:

```bash
cd /opt/oni-chat-overlay
umask 077
cp .env.example .env
nano .env
chmod 600 .env
```

Set these values:

```dotenv
NODE_ENV=production
PORT=3000

TWITCH_BOT_USERNAME=BOT_USERNAME
TWITCH_CHANNEL=CHANNEL_NAME
TWITCH_OAUTH_TOKEN=oauth_token_for_the_bot_account
TWITCH_CLIENT_ID=TWITCH_CLIENT_ID

RELAY_PORT=8787
RELAY_MAX_CLIENTS=100
RELAY_ALLOWED_ORIGINS=https://OVERLAY_DOMAIN
```

Use the bot account username for `TWITCH_BOT_USERNAME`, not the broadcaster account name. `TWITCH_CHANNEL` is the broadcaster channel the bot should read, without `#`.

`TWITCH_CLIENT_ID` is used by the relay to load the real global and channel badge image URLs from Twitch. If it is missing, chat still works but the overlay uses readable badge labels as a fallback.

Never put the OAuth token in the browser URL, OBS custom CSS, frontend code, Git, or any variable beginning with `VITE_`.

## 4. Create the Twitch IRC token

Create or use a Twitch application in the [Twitch Developer Console](https://dev.twitch.tv/console/apps). The redirect URL must exactly match the redirect URL registered in that application.

Generate a token while logged into Twitch as `BOT_USERNAME`. Use the IRC scopes:

```text
chat:read chat:edit
```

For an implicit token flow, open this URL after replacing `TWITCH_CLIENT_ID` and `OVERLAY_DOMAIN`:

```text
https://id.twitch.tv/oauth2/authorize?client_id=TWITCH_CLIENT_ID&redirect_uri=https%3A%2F%2FOVERLAY_DOMAIN&response_type=token&scope=chat%3Aread%20chat%3Aedit
```

The redirect URL contains the token in the URL fragment after `#access_token=`. Copy only the token value into `TWITCH_OAUTH_TOKEN`. Do not share the fragment or token.

Validate the token without printing it:

```bash
read -rsp "Twitch token: " TOKEN; echo
TOKEN="${TOKEN#oauth:}"
curl -sS -H "Authorization: OAuth $TOKEN" https://id.twitch.tv/oauth2/validate
unset TOKEN
```

The response must identify `BOT_USERNAME` and include `chat:read` and `chat:edit`. If it contains `user:read:chat` or `user:write:chat` only, generate a new IRC token; those are not the scopes used by this relay.

## 5. Build and start the services

Build and start the two containers:

```bash
cd /opt/oni-chat-overlay
docker compose build
docker compose up -d
docker compose ps
```

Check the relay:

```bash
curl http://127.0.0.1:8787/health
docker compose logs --tail=100 relay
```

Expected relay output includes:

```text
[relay] connected to Twitch IRC; joining #CHANNEL_NAME
[relay] joined #CHANNEL_NAME
```

Health should eventually report `"connected":true`. A token change only requires recreating the relay:

```bash
docker compose up -d --force-recreate relay
```

Source or dependency changes require a build before recreating the affected service.

## 6. Configure HTTPS and WebSocket routing

Point `OVERLAY_DOMAIN` at the reverse proxy and terminate TLS there. The `/ws/chat` path must preserve WebSocket upgrades. A Caddy configuration is:

```caddyfile
OVERLAY_DOMAIN {
    @chat_ws path /ws/chat
    reverse_proxy @chat_ws 127.0.0.1:8787
    reverse_proxy 127.0.0.1:3000
}
```

If the proxy sends all paths to the web service instead, the web container can bridge `/ws/chat` to the internal `relay` service. Do not expose port `8787` publicly.

## 7. Test before going live

First test demo mode. Open:

```text
https://OVERLAY_DOMAIN/overlay?demo=true
```

You should see sample messages without Twitch credentials.

Then open the control room at `https://OVERLAY_DOMAIN/`, enter `CHANNEL_NAME`, disable **Use demo signal**, and copy the generated live URL.

In OBS:

1. Add a **Browser Source**.
2. Paste the generated `/overlay?...` URL.
3. Set the source size to `1920 x 1080` or `1080 x 1920`.
4. Keep the page background transparent and remove custom CSS that adds a background or scrollbar.
5. Put the Browser Source above the game or display capture in the Sources list.
6. Send a new Twitch message from the channel account or another account, not the bot account.

Check the relay while testing:

```bash
curl http://127.0.0.1:8787/health
docker compose logs -f relay
```

The health response should show `connected:true` and `clients:1` while OBS is open. Twitch IRC does not provide chat history to a newly connected overlay; the relay keeps a small recent-message buffer for reconnects.

## 8. Routine operations

Restart without rebuilding:

```bash
docker compose restart
```

Rebuild after application or dependency changes:

```bash
docker compose build
docker compose up -d
```

Inspect service status and logs:

```bash
docker compose ps
docker compose logs --tail=100 web relay
```

Do not use `docker compose down` for routine updates unless you intentionally want to stop the stack. Do not commit `.env` or post OAuth tokens in tickets, screenshots, or chat.
