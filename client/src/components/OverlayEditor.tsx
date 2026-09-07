import { useRef, useState } from "react";
import type { OverlayConfig } from "@shared/chat";
import { demoMessages } from "@/lib/demoMessages";
import ChatMessage from "@/components/overlay/ChatMessage";

type Props = {
  config: OverlayConfig;
  onPositionChange: (horizontal: OverlayConfig["horizontal"], vertical: OverlayConfig["vertical"]) => void;
};

type ScreenFormat = "landscape" | "portrait";

const horizontalPositions: OverlayConfig["horizontal"][] = ["left", "center", "right"];
const verticalPositions: OverlayConfig["vertical"][] = ["top", "center", "bottom"];

export default function OverlayEditor({ config, onPositionChange }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [screenFormat, setScreenFormat] = useState<ScreenFormat>("landscape");
  const screenRatio = screenFormat === "landscape" ? "16 / 9" : "9 / 16";

  const updatePosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const horizontalIndex = Math.max(0, Math.min(2, Math.floor(((clientX - bounds.left) / bounds.width) * 3)));
    const verticalIndex = Math.max(0, Math.min(2, Math.floor(((clientY - bounds.top) / bounds.height) * 3)));
    const horizontal = horizontalPositions[horizontalIndex];
    const vertical = verticalPositions[verticalIndex];
    onPositionChange(horizontal, vertical);
  };

  return <section className="overlay-editor">
    <div className="editor-heading"><span>DRAG TO PLACE</span><span>LIVE DEMO</span></div>
    <div className="editor-formats" aria-label="Preview screen format">
      <span>SCREEN FORMAT</span>
      <button className={screenFormat === "landscape" ? "is-selected" : ""} onClick={() => setScreenFormat("landscape")}>1920 x 1080</button>
      <button className={screenFormat === "portrait" ? "is-selected" : ""} onClick={() => setScreenFormat("portrait")}>1080 x 1920</button>
    </div>
    <div ref={canvasRef} className={`editor-canvas screen-${screenFormat}`} style={{ "--screen-ratio": screenRatio } as React.CSSProperties}>
      <div className="editor-grid" aria-hidden="true" />
      <div
        className={`editor-chat theme-${config.theme} accent-${config.accent} horizontal-${config.horizontal} vertical-${config.vertical} ${dragging ? "is-dragging" : ""}`}
        style={{ "--chat-width": `${Math.min(config.width, 360)}px`, "--font-size": `${Math.max(12, config.fontSize * 0.64)}px`, "--message-color": config.messageColor, "--overlay-opacity": config.opacity } as React.CSSProperties}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          updatePosition(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => { if (dragging) updatePosition(event.clientX, event.clientY); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {demoMessages.slice(0, 3).map((message) => <ChatMessage key={message.id} message={message} duration={999} showBadges={config.showBadges} showTimestamps={config.showTimestamps} showUsernames={config.showUsernames} showEmotes={config.showEmotes} compact={config.compact} animation="none" speed={1} messageColor={config.messageColor} />)}
      </div>
      <span className="editor-hint">{dragging ? "RELEASE TO SET POSITION" : "DRAG CHAT BLOCK"}</span>
    </div>
    <div className="editor-position"><span>POSITION</span><strong>{config.horizontal.toUpperCase()} / {config.vertical.toUpperCase()}</strong></div>
  </section>;
}