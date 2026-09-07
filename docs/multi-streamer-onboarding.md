# Multi-Streamer Onboarding

The working repository now supports an approval-based onboarding flow for other streamers. Streamers sign in to `oni.laiki.fi`, request a tenant, wait for administrator approval, and then connect Twitch through OAuth. They never paste a Twitch password, client secret, or raw token into the overlay URL.

## Trust model

The site uses the existing authenticated Manus account session for the human user. A streamer request is associated with that user ID. An administrator reviews requests at `/admin/streamers`; approval creates a tenant record containing the requested channel and an exact allowed origin. The tenant owner can later connect Twitch only to their own tenant.

Twitch access and refresh tokens are encrypted with AES-256-GCM using the server-only `TWITCH_CREDENTIAL_ENCRYPTION_KEY`. The browser receives only tenant metadata and a boolean connection state. The relay decrypts credentials inside the server process, refreshes expiring access tokens, and routes each WebSocket client by tenant ID plus the tenant’s configured channel. A client cannot select another tenant’s channel by changing the URL.

## Twitch application setup

Create one Twitch Developer application for `oni.laiki.fi` at [Twitch Developer Console](https://dev.twitch.tv/console/apps). Set the OAuth redirect URL to:

```text
https://oni.laiki.fi/api/twitch/oauth/callback
```

The application requests only the `chat:read` scope. Keep the Twitch client ID and client secret in the server environment. The client secret must never be placed in Vite variables, OBS URLs, browser local storage, or Git. In the Twitch Developer Console, register the callback exactly as `https://oni.laiki.fi/api/twitch/oauth/callback`; do not add a trailing slash or register a different hostname for production.

## Streamer onboarding

A streamer signs in at `https://oni.laiki.fi/`, enters a unique streamer ID and Twitch channel, and submits an access request. They should also direct the approval request to **lakimmo@protonmail.com** using the request link shown in the control room. The administrator opens `https://oni.laiki.fi/admin/streamers`, reviews the request, and selects **APPROVE**. Approval creates the tenant but does not yet connect Twitch.

The streamer then selects the approved tenant and chooses **CONNECT TWITCH**. Twitch displays the authorization page. The callback validates the session-bound, one-time state cookie before exchanging the authorization code. The server validates the Twitch profile, encrypts the access and refresh tokens, and stores them in the tenant record. The Browser Source URL contains only presentation settings plus the non-secret tenant identifier.

## Per-streamer overlay URL

The control room generates a URL containing the tenant and channel, for example:

```text
https://oni.laiki.fi/overlay?tenant=alpha&channel=alpha_channel&demo=false&theme=oni&accent=magenta
```

The URL can be copied into the streamer’s OBS Browser Source. No Twitch token belongs in this URL. If a streamer disconnects Twitch, their encrypted credentials are deleted and the relay stops loading that tenant’s Twitch connection.

## Resend request notifications

Create or select a Resend account, verify the sending domain for `oni.laiki.fi`, and create an API key with permission to send mail. The application uses Resend SMTP with `smtp.resend.com` on port `587`, username `resend`, and the API key as the password. Set `SMTP_FROM` to an address on the verified domain. Every request email is sent as plain text to `lakimmo@protonmail.com`; SMTP failures are logged without discarding the database request.

## Server environment

The existing legacy variables remain supported for a single `default` tenant. For authenticated onboarding, the server also requires:

```dotenv
PUBLIC_APP_ORIGIN=https://oni.laiki.fi
TWITCH_CLIENT_ID=server_only_client_id
TWITCH_CLIENT_SECRET=server_only_client_secret
TWITCH_CREDENTIAL_ENCRYPTION_KEY=server_only_32_byte_key
```

Generate the encryption key on the Ubuntu VM with:

```bash
openssl rand -base64 32
```

Keep the server environment file readable only by its owner:

```bash
chmod 600 /opt/oni-chat-overlay/.env
```

## End-to-end test checklist

1. Sign in with the site owner account and open `/admin/streamers`.
2. In a separate browser session, sign in with a dedicated test streamer account, submit a request using a unique test tenant slug and the test Twitch channel, and confirm that the request appears in the admin list.
3. Confirm that the request email arrives at `lakimmo@protonmail.com` and that its sender matches the verified `SMTP_FROM` address.
4. Approve the request in the admin page. Return to the streamer session, select the approved tenant, and choose **CONNECT TWITCH**.
5. Authorize the test Twitch account. Confirm that Twitch returns to `https://oni.laiki.fi/?twitch=connected` and that the tenant displays as connected without exposing tokens in the browser or URL.
6. Copy the tenant-specific overlay URL into an OBS Browser Source. Send a test chat message from a second Twitch account and confirm it appears only in that tenant’s overlay.
7. Disconnect the test tenant after verification and revoke the test app authorization from the Twitch account’s connections page if the account will not be used again.

## Operational safeguards

The current implementation deliberately keeps tenant creation behind administrator approval. It enforces owner checks for request creation, tenant listing, OAuth start, OAuth callback, and disconnect operations. The relay uses exact allowed-origin matching, a tenant-specific channel check, a per-IP-and-tenant connection limiter, a per-tenant client cap, a small WebSocket payload limit, and disabled WebSocket compression.

The current multi-streamer design is suitable for a small trusted service. Before opening registration publicly, add email verification or an invite policy, audit events for every approval and disconnect, abuse monitoring, account lockout controls, and a documented token-revocation process. Do not make the admin route publicly discoverable as a substitute for authorization; the backend admin procedure remains the authority.
