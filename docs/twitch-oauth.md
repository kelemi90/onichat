# Getting oauth

You need to get "chat:read chat:edit" as scope. Run this command using the same Twitch application configured by `TWITCH_CLIENT_ID`, then copy the User Access Token to `TWITCH_OAUTH_TOKEN` and the Refresh Token to `TWITCH_REFRESH_TOKEN`. The relay refreshes the access token and persists Twitch's rotated refresh token in its Docker volume. Keep `TWITCH_CLIENT_SECRET` configured if your Twitch application requires it for token refresh.

```bash
twitch token --user-token --dcf --scopes "chat:read chat:edit"
```