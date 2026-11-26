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
  aspect-ratio: 520 / 640;
  max-height: calc(100% - 12px);
  max-width: calc(100% - 12px);
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 24px 64px rgba(6, 4, 18, 0.72),
    0 0 0 2px rgba(245, 197, 66, 0.44),
    0 0 28px rgba(224, 62, 82, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  background: #140f24;
  cursor: pointer;
  touch-action: none;
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
  font-size: clamp(36px, 7.2vh, 52px);
  font-weight: 900;
  line-height: 1;
  color: #fffef6;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 3px 0 #3f1018,
    0 6px 18px rgba(15, 6, 28, 0.75),
    0 0 22px rgba(250, 204, 21, 0.4);
  transition: transform 0.11s cubic-bezier(0.22, 1.45, 0.36, 1), opacity 0.18s ease;
  will-change: transform;
}

.flappy-score-live.pop {
  transform: scale(1.24);
}

.flappy-phase-pill {
  margin-top: 6px;
  padding: 3px 13px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.7px;
  color: #fde68a;
  background: rgba(16, 10, 32, 0.58);
  border: 1px solid rgba(245, 197, 66, 0.44);
  box-shadow: 0 4px 12px rgba(8, 4, 18, 0.35);
  backdrop-filter: blur(5px);
}

/* Overlays */
.flappy-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 20px 18px 22px;
  z-index: 8;
  transition: opacity 0.18s ease;
}

.flappy-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

/* Ready Overlay lets taps on empty sky flap immediately with zero latency */
.flappy-ready-overlay {
  pointer-events: none;
}

.flappy-ready-header {
  margin-top: 30px;
  text-align: center;
  padding: 11px 22px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(20, 12, 36, 0.78), rgba(38, 15, 44, 0.64));
  border: 1px solid rgba(245, 197, 66, 0.46);
  box-shadow:
    0 10px 28px rgba(10, 5, 22, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(6px);
}

.flappy-ready-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2.2px;
  color: #facc15;
  text-transform: uppercase;
}

.flappy-ready-title {
  margin: 3px 0 4px;
  font-size: clamp(20px, 3.4vh, 26px);
  font-weight: 900;
  color: #fffaf0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.58);
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
  gap: 11px;
  margin-bottom: 12px;
}

.flappy-tap-hint {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 800;
  color: #fffef5;
  background: linear-gradient(135deg, rgba(220, 44, 62, 0.94), rgba(162, 22, 46, 0.94));
  border: 1px solid rgba(253, 224, 71, 0.72);
  box-shadow: 0 6px 20px rgba(153, 27, 27, 0.48);
  animation: flappy-pulse 1.6s ease-in-out infinite;
}

@keyframes flappy-pulse {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.03); }
}

.flappy-char-selector {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 444px;
  padding: 8px;
  border-radius: 15px;
  background: rgba(14, 10, 26, 0.8);
  border: 1px solid rgba(245, 197, 66, 0.38);
  box-shadow: 0 10px 26px rgba(6, 4, 18, 0.5);
  backdrop-filter: blur(8px);
}

.flappy-char-pill {
  appearance: none;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 11px;
  padding: 8px 6px;
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
  background: rgba(255, 255, 255, 0.13);
}

.flappy-char-pill.active {
  background: linear-gradient(180deg, rgba(224, 62, 82, 0.34), rgba(245, 197, 66, 0.18));
  border-color: #facc15;
  box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.45), 0 4px 14px rgba(224, 62, 82, 0.34);
}

.flappy-char-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-bottom: 1px;
  box-shadow: 0 0 9px currentColor;
}

.flappy-char-name {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.flappy-char-desc {
  font-size: 10px;
  color: rgba(241, 245, 249, 0.82);
  line-height: 1.2;
  text-align: center;
}

/* Modal Backdrop for Pause & Game Over (preserves .flappy-modal-overlay:not(.hidden) contract) */
.flappy-modal-overlay {
  justify-content: center;
  background: rgba(10, 7, 22, 0.58);
  backdrop-filter: blur(5px);
}

.flappy-card {
  width: min(88%, 368px);
  padding: 22px 20px 20px;
  border-radius: 18px;
  background: linear-gradient(165deg, rgba(32, 20, 54, 0.96), rgba(16, 12, 32, 0.98));
  border: 1.5px solid rgba(245, 197, 66, 0.56);
  box-shadow:
    0 22px 48px rgba(0, 0, 0, 0.64),
    0 0 24px rgba(224, 62, 82, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
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
  letter-spacing: 2.2px;
  color: #facc15;
}

.flappy-card-title {
  margin: 4px 0 14px;
  font-size: 24px;
  font-weight: 900;
  color: #fffaf0;
  text-shadow: 0 2px 10px rgba(224, 62, 82, 0.48);
}

/* Scorecard Medal + Score Grid */
.flappy-scorecard-top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.11);
  margin-bottom: 12px;
}

.flappy-medal-wrap {
  flex: 0 0 auto;
  width: 74px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.flappy-medal-disc {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  border: 3px solid var(--medal-rim, #64748b);
  background: radial-gradient(circle at 32% 28%, #ffffff, var(--medal-color, #94a3b8) 62%, var(--medal-rim, #475569));
  box-shadow: 0 0 20px var(--medal-glow, rgba(148, 163, 184, 0.4));
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
  color: rgba(248, 250, 252, 0.74);
  font-weight: 600;
}

.flappy-score-value {
  font-size: 25px;
  font-weight: 900;
  line-height: 1;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
}

.flappy-score-value.best {
  font-size: 20px;
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
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(15, 10, 28, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 11.5px;
  color: rgba(241, 245, 249, 0.88);
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
  border: 1px solid rgba(253, 224, 71, 0.58);
  box-shadow: 0 6px 18px rgba(185, 28, 44, 0.44);
}

.flappy-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

@media (max-width: 480px) {
  .flappy-overlay {
    padding: 14px 10px 16px;
  }
  .flappy-ready-header {
    margin-top: 22px;
    padding: 9px 14px;
  }
  .flappy-char-selector {
    gap: 5px;
    padding: 6px;
  }
  .flappy-char-pill {
    padding: 6px 4px;
  }
  .flappy-char-name {
    font-size: 11.5px;
  }
  .flappy-char-desc {
    font-size: 9px;
  }
}
`;
