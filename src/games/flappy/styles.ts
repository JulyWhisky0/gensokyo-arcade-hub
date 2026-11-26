export const FLAPPY_STYLE_ID = 'flappy-gensokyo-styles';

export const FLAPPY_STYLES = `
.flappy-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  font-family: system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.flappy-stage {
  position: relative;
  aspect-ratio: 420 / 640;
  max-height: calc(100% - 12px);
  max-width: calc(100% - 12px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 20px 55px rgba(8, 5, 20, 0.65),
    0 0 0 2px rgba(245, 197, 66, 0.38),
    inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  background: #140f24;
  cursor: pointer;
}

.flappy-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

/* Top Live HUD */
.flappy-hud {
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  z-index: 4;
}

.flappy-score-live {
  font-size: clamp(34px, 7vh, 50px);
  font-weight: 900;
  line-height: 1;
  color: #fffef6;
  letter-spacing: 1px;
  text-shadow:
    0 3px 0 #3f1018,
    0 6px 16px rgba(15, 6, 28, 0.72),
    0 0 18px rgba(250, 204, 21, 0.35);
  transition: transform 0.12s cubic-bezier(0.22, 1.4, 0.36, 1);
}

.flappy-score-live.pop {
  transform: scale(1.22);
}

.flappy-phase-pill {
  margin-top: 6px;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #fde68a;
  background: rgba(18, 12, 34, 0.56);
  border: 1px solid rgba(245, 197, 66, 0.4);
  backdrop-filter: blur(4px);
}

/* Overlays */
.flappy-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 22px;
  z-index: 8;
  transition: opacity 0.2s ease;
}

.flappy-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

/* Ready Overlay lets clicks on empty sky flap immediately! */
.flappy-ready-overlay {
  pointer-events: none;
}

.flappy-ready-header {
  margin-top: 34px;
  text-align: center;
  padding: 10px 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(20, 12, 36, 0.76), rgba(34, 15, 42, 0.62));
  border: 1px solid rgba(245, 197, 66, 0.42);
  box-shadow: 0 8px 24px rgba(10, 5, 22, 0.42);
  backdrop-filter: blur(6px);
}

.flappy-ready-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #facc15;
  text-transform: uppercase;
}

.flappy-ready-title {
  margin: 2px 0 3px;
  font-size: clamp(19px, 3.2vh, 24px);
  font-weight: 900;
  color: #fffaf0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
}

.flappy-ready-sub {
  font-size: 12px;
  color: #f5d0c5;
}

.flappy-ready-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.flappy-tap-hint {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 800;
  color: #fffef5;
  background: linear-gradient(135deg, rgba(217, 48, 62, 0.92), rgba(168, 24, 48, 0.92));
  border: 1px solid rgba(253, 224, 71, 0.65);
  box-shadow: 0 6px 18px rgba(153, 27, 27, 0.45);
  animation: flappy-pulse 1.65s ease-in-out infinite;
}

@keyframes flappy-pulse {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.03); }
}

.flappy-char-selector {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  width: 100%;
  max-width: 376px;
  padding: 7px;
  border-radius: 14px;
  background: rgba(14, 11, 26, 0.78);
  border: 1px solid rgba(245, 197, 66, 0.34);
  backdrop-filter: blur(8px);
}

.flappy-char-pill {
  appearance: none;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 7px 5px;
  color: #f8fafc;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: transform 0.14s ease, border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.flappy-char-pill:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.12);
}

.flappy-char-pill.active {
  background: linear-gradient(180deg, rgba(224, 62, 82, 0.3), rgba(245, 197, 66, 0.16));
  border-color: #facc15;
  box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.45), 0 4px 12px rgba(224, 62, 82, 0.3);
}

.flappy-char-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-bottom: 1px;
  box-shadow: 0 0 8px currentColor;
}

.flappy-char-name {
  font-size: 12.5px;
  font-weight: 800;
  line-height: 1.2;
}

.flappy-char-desc {
  font-size: 9.5px;
  color: rgba(241, 245, 249, 0.78);
  line-height: 1.15;
  text-align: center;
}

/* Modal Backdrop for Pause & Game Over */
.flappy-modal-overlay {
  justify-content: center;
  background: rgba(12, 8, 24, 0.56);
  backdrop-filter: blur(4px);
}

.flappy-card {
  width: min(90%, 348px);
  padding: 20px 18px 18px;
  border-radius: 18px;
  background: linear-gradient(165deg, rgba(30, 20, 52, 0.96), rgba(18, 13, 34, 0.98));
  border: 1.5px solid rgba(245, 197, 66, 0.52);
  box-shadow:
    0 20px 44px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  color: #fffaf0;
  text-align: center;
  animation: flappy-card-in 0.22s cubic-bezier(0.22, 1.25, 0.36, 1);
}

@keyframes flappy-card-in {
  from { opacity: 0; transform: translateY(14px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.flappy-card-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #facc15;
}

.flappy-card-title {
  margin: 4px 0 14px;
  font-size: 24px;
  font-weight: 900;
  color: #fffaf0;
  text-shadow: 0 2px 10px rgba(224, 62, 82, 0.45);
}

/* Scorecard Medal + Score Grid */
.flappy-scorecard-top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}

.flappy-medal-wrap {
  flex: 0 0 auto;
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.flappy-medal-disc {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  font-weight: 900;
  border: 3px solid var(--medal-rim, #64748b);
  background: radial-gradient(circle at 32% 28%, #ffffff, var(--medal-color, #94a3b8) 62%, var(--medal-rim, #475569));
  box-shadow: 0 0 18px var(--medal-glow, rgba(148, 163, 184, 0.4));
  color: #1f1629;
}

.flappy-medal-label {
  font-size: 11px;
  font-weight: 800;
  color: #fde68a;
  white-space: nowrap;
}

.flappy-score-cols {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.flappy-score-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.flappy-score-label {
  font-size: 12px;
  color: rgba(248, 250, 252, 0.72);
  font-weight: 600;
}

.flappy-score-value {
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
}

.flappy-score-value.best {
  font-size: 19px;
  color: #fde047;
}

.flappy-new-badge {
  display: inline-block;
  margin-left: 5px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 9.5px;
  font-weight: 900;
  background: #e11d48;
  color: #ffffff;
  vertical-align: middle;
}

.flappy-meta-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 11px;
  border-radius: 10px;
  background: rgba(15, 10, 28, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  color: rgba(241, 245, 249, 0.85);
  margin-bottom: 10px;
}

.flappy-medal-note {
  font-size: 11.5px;
  color: #f5d0c5;
  margin-bottom: 14px;
}

.flappy-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flappy-btn {
  appearance: none;
  border: none;
  border-radius: 11px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.14s ease, background 0.14s ease;
}

.flappy-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.07);
}

.flappy-btn:active {
  transform: translateY(1px);
}

.flappy-btn-primary {
  background: linear-gradient(135deg, #e03140, #b91c2c);
  color: #fffef6;
  border: 1px solid rgba(253, 224, 71, 0.55);
  box-shadow: 0 6px 18px rgba(185, 28, 44, 0.42);
}

.flappy-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.18);
}
`;
