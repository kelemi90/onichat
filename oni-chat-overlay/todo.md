# Project TODO

- [x] Establish transparent OBS overlay shell and responsive canvas behavior
- [x] Implement cinematic neon-noir Oni visual system and theme architecture
- [x] Add representative demo mode without Twitch credentials
- [x] Implement animated chat messages with capped history and expiry cleanup
- [x] Add Twitch badge, emote, username color, cheer, subscription, and raid rendering support
- [x] Add local configuration screen for channel, display, animation, theme, and overlay URL settings
- [x] Add URL configuration parsing and validation
- [x] Add reduced-motion accessibility behavior
- [x] Implement server-mediated Twitch IRC/WebSocket relay
- [x] Keep Twitch client credentials and access token server-side
- [x] Add relay reconnect handling, validation, health endpoint, and graceful failure states
- [x] Add WebSocket client connection handling from the overlay
- [x] Add Vitest coverage for configuration parsing, IRC parsing, reconnect/backoff, and message expiry
- [x] Add Dockerfiles and Docker Compose deployment package
- [x] Add environment-variable example and secret-handling documentation
- [x] Add reverse-proxy guidance for chat.laiki.fi
- [x] Add Proxmox deployment and upgrade instructions
- [x] Add OBS Browser Source setup documentation
- [x] Run type checks, tests, build, and visual verification
- [x] Save final project checkpoint and deliver source package/documentation

## History

- Initial project scaffold created before the relay requirement was added.
- Relay requirement revised to an always-on Docker Compose service on the user's Proxmox server.

## Security hardening

- [x] Audit secret handling, URL inputs, WebSocket exposure, and relay trust boundaries
- [x] Validate and constrain relay channel and WebSocket client inputs
- [x] Add origin and connection-rate controls for the WebSocket relay
- [x] Add browser security headers and restrictive content-security policy
- [x] Harden Docker Compose privileges, filesystem access, and secret handling
- [x] Add security-focused tests for origin checks, validation, and rate limits
- [x] Document threat model, firewall rules, reverse-proxy requirements, and operational security
- [x] Re-run security verification and save the hardened checkpoint

## Deployment documentation follow-up

- [x] Add a step-by-step Proxmox setup guide for Docker, Twitch credentials, reverse proxy, security checks, and OBS

## Hostname update

- [x] Replace the previous public hostname with oni.laiki.fi in environment and deployment documentation
