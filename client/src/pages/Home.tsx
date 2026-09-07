import { useMemo, useState } from "react";
import { Link } from "wouter";
import { DEFAULT_OVERLAY_CONFIG, type OverlayConfig } from "@shared/chat";
import { toOverlayUrl } from "@/lib/overlayConfig";
import OverlayEditor from "@/components/OverlayEditor";

export default function Home() {
  const [config, setConfig] = useState<OverlayConfig>({ ...DEFAULT_OVERLAY_CONFIG, demo: true });
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => toOverlayUrl(config), [config]);
  const update = <K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]) => setConfig((current) => ({ ...current, [key]: value }));
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };

  return <main className="control-room">
    <div className="control-grid">
      <section className="control-intro">
        <p className="eyebrow">ONI // CHAT RELAY CONTROL ROOM</p>
        <h1>Make the chat feel<br /><span>alive after dark.</span></h1>
        <p className="lede">A transparent neon-noir signal layer for your stream. Tune the atmosphere here, then drop the generated URL straight into OBS.</p>
        <div className="signal-card"><span className="signal-dot" /> <span>DEMO SIGNAL ONLINE</span><strong>WS / READY</strong></div>
        <Link href={url} className="preview-link">Open overlay preview ↗</Link>
        <OverlayEditor config={config} onPositionChange={(horizontal, vertical) => setConfig((current) => ({ ...current, horizontal, vertical }))} />
      </section>
      <section className="settings-panel">
        <div className="panel-heading"><span>LOCAL CONFIGURATION</span><span className="panel-index">SYS.01</span></div>
        <label>TWITCH CHANNEL<input value={config.channel} onChange={(e) => update("channel", e.target.value.replace(/^#/, "").toLowerCase())} placeholder="your_channel" /></label>
        <div className="form-row"><label>FONT SIZE<input type="number" min="12" max="42" value={config.fontSize} onChange={(e) => update("fontSize", Number(e.target.value))} /></label><label>MAX MESSAGES<input type="number" min="1" max="30" value={config.maxMessages} onChange={(e) => update("maxMessages", Number(e.target.value))} /></label></div>
        <div className="form-row"><label>DISPLAY SEC.<input type="number" min="2" max="120" value={config.duration} onChange={(e) => update("duration", Number(e.target.value))} /></label><label>CHAT WIDTH<input type="number" min="240" max="1000" value={config.width} onChange={(e) => update("width", Number(e.target.value))} /></label></div>
        <div className="form-row"><label>HORIZONTAL<select value={config.horizontal} onChange={(e) => update("horizontal", e.target.value as OverlayConfig["horizontal"])}><option value="left">LEFT</option><option value="center">CENTER</option><option value="right">RIGHT</option></select></label><label>VERTICAL<select value={config.vertical} onChange={(e) => update("vertical", e.target.value as OverlayConfig["vertical"])}><option value="top">TOP</option><option value="center">CENTER</option><option value="bottom">BOTTOM</option></select></label></div>
        <div className="form-row"><label>THEME<select value={config.theme} onChange={(e) => update("theme", e.target.value as OverlayConfig["theme"])}><option value="oni">CYBERPUNK ONI</option><option value="minimal">MINIMAL DARK</option><option value="matrix">MATRIX SIGNAL</option></select></label><label>ACCENT<select value={config.accent} onChange={(e) => update("accent", e.target.value as OverlayConfig["accent"])}><option value="magenta">HOT PINK</option><option value="cyan">ELECTRIC BLUE</option><option value="red">NEON RED</option></select></label></div>
        <div className="form-row"><label>MESSAGE COLOR<input type="color" value={config.messageColor} onChange={(e) => update("messageColor", e.target.value)} /></label><label>ANIMATION<select value={config.animation} onChange={(e) => update("animation", e.target.value as OverlayConfig["animation"])}><option value="hud">HUD GLIDE</option><option value="slide">SOFT SLIDE</option><option value="fade">FADE ONLY</option><option value="none">STATIC</option></select></label></div>
        <div className="form-row"><label>SPEED<select value={config.speed} onChange={(e) => update("speed", Number(e.target.value))}><option value="0.5">SLOW</option><option value="1">STANDARD</option><option value="1.5">FAST</option><option value="2">QUICK</option></select></label><span /></div>
        <label className="toggle-line"><input type="checkbox" checked={config.demo} onChange={(e) => update("demo", e.target.checked)} /><span>USE DEMO SIGNAL</span><small>No credentials required</small></label>
        <label className="toggle-line"><input type="checkbox" checked={config.compact} onChange={(e) => update("compact", e.target.checked)} /><span>COMPACT MODE</span><small>More messages, less footprint</small></label>
        <div className="url-block"><span>OBS BROWSER SOURCE URL</span><code>{url}</code><button onClick={copy}>{copied ? "COPIED" : "COPY URL"}</button></div>
      </section>
    </div>
    <footer>ONI CHAT OVERLAY <span>LOCAL CONTROL / CREDENTIALS NEVER ENTER THE BROWSER</span></footer>
  </main>;
}
