# Oni Chat Overlay on Proxmox

This guide deploys the transparent cyberpunk/oni Twitch chat overlay as an always-on Docker Compose service on a Proxmox server. It uses one web container for the control room and overlay pages plus one relay container for the Twitch IRC connection. Twitch credentials stay on the server and are never placed in the browser URL.

## 1. Choose the Proxmox guest

Use a small Debian 12 or Ubuntu 24.04 virtual machine for the deployment. A VM is the preferred option because Docker has predictable kernel and filesystem behavior there. An unprivileged LXC can work in some environments, but Docker-in-LXC adds nesting and storage configuration that is unnecessary for this service.

A practical starting point is **1 vCPU, 1–2 GB RAM, 8–16 GB SSD storage, and a bridged network interface**. The overlay is lightweight; the extra memory provides room for the guest operating system, Docker, and the reverse proxy.

| Setting | Recommended value |
|---|---|
| Guest type | Debian 12 or Ubuntu 24.04 VM |
| CPU | 1 vCPU |
| Memory | 1–2 GB |
| Disk | 8–16 GB, SSD-backed if available |
| Network | Bridged interface with a stable LAN address |
| Public exposure | HTTPS through a reverse proxy only |

Create the VM in Proxmox, install the operating system, assign it a stable DHCP reservation or static address, and log in over SSH. Replace `192.168.1.50` below with the VM's actual address.

## 2. Update the guest and install Docker

Run these commands inside the VM, not on the Proxmox host:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker version
docker compose version
```

If the Docker CE repository does not provide candidates on your VM, use Ubuntu's signed packages instead. This is the recommended recovery path for the `Package 'docker-ce' has no installation candidate` error. Do not mix the failed Docker CE repository install with a second third-party repository:

```bash
sudo rm -f /etc/apt/sources.list.d/docker.sources
sudo apt update
sudo apt install -y docker.io docker-compose-v2 util-linux-extra
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

Add your user to the Docker group, then log out and back in so the group membership is refreshed. Until then, prefix Docker commands with `sudo`:

```bash
sudo usermod -aG docker "$USER"
```

If `docker-compose-v2` is not found, enable Ubuntu's Universe repository and retry:

```bash
sudo add-apt-repository universe
sudo apt update
sudo apt install -y docker.io docker-compose-v2 util-linux-extra
```

Do not install `podman-docker` for this project; it is a compatibility wrapper, not the Docker Engine runtime expected by this Compose deployment.

## 3. Put the project on the VM

Create a dedicated deployment directory and copy the project source to it. The simplest option is to export the project checkpoint from Manus and upload the resulting archive to the VM. If the source is in a Git repository, clone the repository instead.

```bash
sudo mkdir -p /opt/oni-chat-overlay
sudo chown -R "$USER":"$USER" /opt/oni-chat-overlay
cd /opt/oni-chat-overlay
```

After extracting or cloning the project, confirm that these files exist:

```bash
ls -1 Dockerfile docker-compose.yml package.json relay/index.ts
```

Keep the directory private. The `.env` file created in the next step contains the Twitch token.

## 4. Create the server-only environment file

Create the file with a restrictive umask and permissions:

```bash
cd /opt/oni-chat-overlay
umask 077
nano .env
chmod 600 .env
```

Use this structure, replacing every placeholder with your real value:

```dotenv
NODE_ENV=production
PORT=3000

TWITCH_BOT_USERNAME=your_bot_account
TWITCH_OAUTH_TOKEN=your_twitch_oauth_token
TWITCH_CHANNEL=your_channel

RELAY_PORT=8787
RELAY_MAX_CLIENTS=100
RELAY_ALLOWED_ORIGINS=https://oni.laiki.fi
```

The OAuth token may be entered with or without the `oauth:` prefix. The relay normalizes it. Do not use a `VITE_` prefix, do not put the token in the overlay URL, and do not paste the token into OBS settings.

The origin value must match the browser origin exactly, including `https://` and the hostname. Do not use `*`, a path, a regular expression, or a trailing slash. If you use a second exact hostname, separate origins with commas.

## 5. Create the Twitch bot token

Use a dedicated Twitch bot account rather than your primary broadcaster account. Generate a chat-capable OAuth token through the Twitch-authorized token flow you trust, then place it only in the VM's `.env` file. Grant the minimum chat permissions required by the relay. This overlay only needs to read chat and does not need moderation, channel-management, or payment permissions.

Treat the token like a password. Do not commit `.env`, include it in screenshots, send it through chat, or put it into a client-side variable. If it is exposed, revoke it immediately in Twitch and replace it in `.env`.

## 6. Build and start the containers

From the project directory, build and start the stack:

```bash
cd /opt/oni-chat-overlay
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 relay
```

If the build stops at either `pnpm install --frozen-lockfile` or `pnpm install --prod --frozen-lockfile`, make sure you are using the latest project files. This project uses a checked-in pnpm patch, and both Docker stages must copy the `patches/` directory before running frozen pnpm installs. Confirm the build context contains the patch and use plain progress output so the underlying package-manager error is visible:

```bash
test -f patches/wouter@3.7.1.patch && echo "patch present"
docker compose build --no-cache --progress=plain relay
docker compose up -d relay
docker compose logs --tail=100 relay
```

The Dockerfile pins pnpm 10.4.1 and prints the active version during the build. If the plain output reports a registry or DNS timeout, fix VM internet access first; if it reports a missing patch, confirm you are building from the project root and that `.dockerignore` is not excluding `patches/`.

The web container should publish only `127.0.0.1:3000` and the relay only `127.0.0.1:8787`. This is intentional: neither port should be directly reachable from the internet.

Check the relay health endpoint from inside the VM:

```bash
curl -fsS http://127.0.0.1:8787/health
```

A healthy response contains JSON with `ok: true`. The `connected` field becomes `true` after the relay successfully joins Twitch. If it remains `false`, inspect the relay logs without copying the token into tickets or chat:

```bash
docker compose logs -f relay
```

## 7. Install or configure the reverse proxy

Use an HTTPS reverse proxy on the VM, another internal machine, or an existing gateway. The public hostname in this example is `oni.laiki.fi`. Route normal HTTP requests to the web service and `/ws/chat` WebSocket requests to the relay.

For Caddy, a configuration equivalent to the following is suitable when Caddy runs on the same VM as Docker:

```caddyfile
oni.laiki.fi {
    @chat_ws path /ws/chat
    reverse_proxy @chat_ws 127.0.0.1:8787
    reverse_proxy 127.0.0.1:3000
}
```

For Nginx, preserve the WebSocket upgrade headers:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name oni.laiki.fi;

    location /ws/chat {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 1h;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Use your reverse proxy's normal certificate automation for `oni.laiki.fi`. The reverse proxy must serve the public site over HTTPS so the overlay can create a secure `wss://` connection. Do not expose the relay port directly as a public TCP service.

## 8. Apply host and guest firewall rules

At the Proxmox and guest layers, allow SSH only from your administration network and allow public traffic only to the reverse proxy's HTTPS port. Do not forward `3000` or `8787` from the router.

If UFW is already your guest firewall and you understand its current SSH policy, a typical rule set is:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status verbose
```

Do not blindly enable or reset a firewall over a remote SSH session. First confirm that your management source range and SSH port are allowed. The Compose loopback bindings provide a second boundary, but they do not replace host, Proxmox, or reverse-proxy firewall rules.

Verify the listeners from the VM:

```bash
sudo ss -lntp | grep -E ':(3000|8787)'
```

The output should show loopback bindings such as `127.0.0.1:3000` and `127.0.0.1:8787`, not `0.0.0.0:3000` or `0.0.0.0:8787`.

## 9. Test the control room and configure OBS

Open the public control room:

```text
https://oni.laiki.fi/
```

Enter the Twitch channel name, choose the font size, maximum messages, display duration, width, accent, animation, speed, and badge visibility. Keep **Use demo signal** enabled first and click the preview or open the generated URL in a browser.

In OBS, add a **Browser Source** with the generated overlay URL. Set the Browser Source width and height to match the scene, for example `1920 × 1080` for a landscape stream or `1080 × 1920` for a vertical stream. Keep the page background transparent. Do not add custom CSS that paints a background or introduces scrollbars.

After demo mode works, disable it in the control room and generate a live URL containing the channel parameter. The Browser Source should connect through `wss://oni.laiki.fi/ws/chat` and show the relay status as messages arrive.

## 10. Perform a security acceptance check

Before considering the deployment live, verify each item below.

| Check | Expected result |
|---|---|
| `chmod 600 .env` | The file is readable only by the deployment user/root. |
| `docker compose ps` | Both services are running and restarting automatically if stopped. |
| `curl http://127.0.0.1:8787/health` | Works from the VM; the relay is not published publicly. |
| External access to `:3000` and `:8787` | Blocked or unavailable from another machine. |
| `RELAY_ALLOWED_ORIGINS` | Exactly matches `https://oni.laiki.fi`. |
| Browser developer tools | No Twitch token appears in URLs, source, or network payloads. |
| `docker compose logs relay` | No token or secret value appears in logs. |
| OBS demo mode | Messages render with a transparent background. |
| OBS live mode | Twitch messages render only after the server-side relay connects. |

## 11. Updates, backups, and token rotation

Keep the VM packages, Docker Engine, reverse proxy, and project image updated. Before an update, copy the project directory without the `.env` file or back up the deployment configuration through your normal encrypted backup system. Never include the Twitch token in an unencrypted backup.

To update the application after replacing the project source:

```bash
cd /opt/oni-chat-overlay
docker compose build --pull
docker compose up -d
docker image prune
```

After updates, repeat the health, listener, reverse-proxy, and OBS checks. Rotate the Twitch token if the VM is rebuilt, access permissions change, the token may have been exposed, or your operational policy requires periodic rotation.

For additional threat-model notes and hardening rationale, read `SECURITY.md` in the project root.
