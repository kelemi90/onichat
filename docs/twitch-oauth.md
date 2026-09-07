# Getting oauth

You need to get "chat:read chat:edit" as scope. Run this command and copy User Access Token and Refresh Token. User Access Token goes to TWITCH_OAUTH_TOKEN=oauth:***

```bash
twitch token --user-token --dcf --scopes "chat:read chat:edit"
```