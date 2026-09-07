type BadgeImage = {
  image_url_1x: string;
  image_url_2x: string;
  image_url_3x: string;
};

type BadgeResponse = {
  data?: Array<{ set_id: string; versions: Array<{ id: string; image_url_1x: string; image_url_2x: string; image_url_3x: string }> }>;
};

const HELIX_URL = "https://api.twitch.tv/helix";

export class TwitchBadgeCatalog {
  private readonly badges = new Map<string, BadgeImage>();
  private loaded = false;

  constructor(private readonly clientId: string, private readonly token: string, private readonly channel: string) {}

  async load() {
    if (!this.clientId || !this.token || !this.channel) return;
    try {
      const userResponse = await this.request(`/users?login=${encodeURIComponent(this.channel)}`);
      const broadcasterId = userResponse.data?.[0]?.id;
      if (!broadcasterId) throw new Error("channel user was not found");

      await Promise.all([
        this.loadEndpoint("/chat/badges/global"),
        this.loadEndpoint(`/chat/badges?broadcaster_id=${encodeURIComponent(broadcasterId)}`),
      ]);
      this.loaded = true;
      console.log(`[relay] loaded ${this.badges.size} Twitch badge variants`);
    } catch (error) {
      console.warn(`[relay] Twitch badge catalog unavailable: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  getUrl(setId: string, version: string) {
    return this.badges.get(`${setId}:${version}`)?.image_url_2x;
  }

  isLoaded() {
    return this.loaded;
  }

  private async loadEndpoint(path: string) {
    const response = await this.request(path) as BadgeResponse;
    for (const set of response.data ?? []) {
      for (const badge of set.versions) {
        this.badges.set(`${set.set_id}:${badge.id}`, {
          image_url_1x: badge.image_url_1x,
          image_url_2x: badge.image_url_2x,
          image_url_3x: badge.image_url_3x,
        });
      }
    }
  }

  private async request(path: string) {
    const response = await fetch(`${HELIX_URL}${path}`, {
      headers: {
        "Client-Id": this.clientId,
        Authorization: `Bearer ${this.token.replace(/^oauth:/i, "")}`,
      },
    });
    if (!response.ok) throw new Error(`Helix returned HTTP ${response.status}`);
    return response.json() as Promise<BadgeResponse & { data?: Array<{ id: string }> }>;
  }
}