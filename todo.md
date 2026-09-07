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

## Ubuntu Docker installation recovery

- [x] Diagnose why the Docker apt repository packages are unavailable on Ubuntu 26.04
- [x] Add a safe installation fallback and verification commands
- [x] Update the Proxmox guide with the corrected Docker installation path

## Docker build recovery

- [x] Diagnose the relay image failure at `pnpm install --prod --frozen-lockfile`
- [x] Make the production dependency installation deterministic in Docker
- [x] Update Proxmox troubleshooting guidance for Docker build failures
- [x] Re-run verification and save a corrected checkpoint

## Docker build-stage recovery

- [x] Diagnose the build-stage `pnpm install --frozen-lockfile` exit 254
- [x] Make the Docker package-manager bootstrap deterministic with explicit pnpm 10.4.1 pinning
- [x] Add build-stage plain-log diagnostics and VM troubleshooting instructions
- [x] Re-run verification and save a corrected checkpoint

## Exit-254 diagnostic follow-up

- [x] Collect complete `docker compose build --progress=plain` output including the first pnpm error
- [x] Apply the targeted fix instead of inferring from exit code 254 on the user's VM
- [x] Verify the fix and save a corrected checkpoint after the user's VM build succeeds; user subsequently confirmed the deployed version is working

## Responsive control room and visible preview

- [x] Make the control room fit narrow and wide browser windows without horizontal overflow
- [x] Add an in-page OBS-style overlay preview using the same configuration and demo/live message renderer
- [x] Add preview canvas sizing and visibility guidance for users
- [x] Verify responsive desktop/mobile layouts and save an updated checkpoint

## Restore baseline and design guide follow-up

- [x] Restore the working baseline at checkpoint c33204f9
- [x] Compare the restored baseline with kelemi90/onichat on GitHub
- [x] Preserve the c332 UI design and responsive preview changes without overwriting the working baseline
- [x] Write a guide for updating graphics, themes, typography, and layout
- [x] Run tests, type check, production build, and visual verification
- [x] Save and deliver the restored compatible checkpoint

## Authentication migration history

- [x] Twitch OAuth website-login migration cancelled by user; no Twitch-auth implementation retained in the restored baseline
