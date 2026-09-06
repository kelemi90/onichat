# Security model and deployment hardening

## Trust boundaries

The browser is treated as untrusted. It receives chat content and presentation settings only; it never receives `TWITCH_OAUTH_TOKEN` or any other Twitch credential. The relay is the only process that connects to Twitch. The relay is configured for one validated channel and rejects arbitrary channel joins.

The relay WebSocket is not intended to be a public service. Docker publishes it only on the Proxmox host loopback interface, and the reverse proxy should route `/ws/chat` to `127.0.0.1:8787` or an equivalent private Docker route. The relay requires an exact `Origin` match from `RELAY_ALLOWED_ORIGINS`, rejects missing origins, limits clients, and throttles repeated connection attempts per source address.

## Secret handling

Store the Twitch OAuth token in the Proxmox host `.env` file with permissions `0600`, or use a Docker secret mechanism supported by your host. Do not put it in frontend code, a `VITE_*` variable, the browser URL, OBS custom CSS, Git, screenshots, or chat messages. If the token is ever exposed, revoke it in Twitch and issue a replacement.

## Firewall and reverse proxy

Allow inbound traffic only to the reverse proxy's HTTPS port. Do not forward ports `8787` or `3000` directly to the internet. If the reverse proxy is on the same host, keep both Compose ports bound to `127.0.0.1`. Restrict the reverse proxy WebSocket route to the expected public hostname and preserve WebSocket upgrade headers.

Use an exact value such as `RELAY_ALLOWED_ORIGINS=https://chat.laiki.fi`. Do not use `*`, a regex, or a user-controlled origin. If you operate multiple hostnames, list each exact origin separated by commas.

## Container hardening

The Compose package uses a read-only root filesystem, a small writable `/tmp`, dropped Linux capabilities, `no-new-privileges`, PID limits, memory limits, loopback-only published ports, and automatic restart. Keep Docker, the host kernel, the reverse proxy, and the base image updated. Review image changes before applying them in production.

## Data and privacy

The relay keeps chat messages in memory only and does not persist chat history. The application should be treated as public-facing display software: do not add analytics, logging, or storage of chat content unless you have a specific privacy policy and retention requirement.

## Operational checklist

Before going live, confirm that the `.env` file is owned by the deployment user and has mode `0600`, the reverse proxy serves HTTPS, `RELAY_ALLOWED_ORIGINS` matches the browser origin exactly, ports `3000` and `8787` are not publicly reachable, and `docker compose logs` does not print tokens. After deployment, verify the relay health endpoint only from the host and test token rotation.

This hardening reduces common exposure risks, but it does not replace host patching, firewall policy, reverse-proxy review, or a professional penetration test for a public production environment.
