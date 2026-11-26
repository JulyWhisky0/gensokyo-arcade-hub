export const PUYO_STYLES = `
.puyo-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 8px;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  color: #f8f1ff;
  font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.puyo-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
}

.puyo-board-frame {
  position: relative;
  border-radius: 14px;
  padding: 5px;
  background: linear-gradient(
    145deg,
    rgba(255, 224, 130, 0.9),
    rgba(208, 42, 68, 0.78) 38%,
    rgba(134, 62, 214, 0.72) 68%,
    rgba(245, 194, 89, 0.88)
  );
  box-shadow:
    0 14px 36px rgba(4, 2, 16, 0.8),
    0 0 28px rgba(155, 78, 230, 0.28),
    0 0 0 1px rgba(255, 236, 175, 0.35),
    inset 0 1px 0 rgba(255, 250, 225, 0.55);
  flex-shrink: 0;
  line-height: 0;
}

.puyo-board-frame::before,
.puyo-board-frame::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: 11px;
}

.puyo-board-frame::before {
  inset: 2px;
  border: 1px solid rgba(255, 232, 160, 0.42);
}

.puyo-board-frame::after {
  inset: -2px;
  border-radius: 16px;
  background: radial-gradient(circle at 12% 8%, rgba(255, 235, 168, 0.36), transparent 28%),
    radial-gradient(circle at 88% 92%, rgba(255, 214, 118, 0.3), transparent 28%);
  opacity: 0.75;
}

.puyo-board-canvas {
  position: relative;
  z-index: 1;
  display: block;
  border-radius: 9px;
  background: #0d0921;
  touch-action: none;
}

/* Ultra-clean Sidebar */
.puyo-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 164px;
  flex-shrink: 0;
  max-height: 100%;
}

.puyo-panel {
  background: linear-gradient(165deg, rgba(24, 16, 52, 0.92), rgba(14, 10, 34, 0.92));
  border: 1px solid rgba(245, 198, 96, 0.32);
  border-radius: 11px;
  padding: 8px 10px;
  box-shadow:
    0 6px 16px rgba(5, 2, 18, 0.36),
    inset 0 1px 0 rgba(255, 240, 196, 0.08);
}

.puyo-panel-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f0c259;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.puyo-preview-canvas {
  display: block;
  width: 100%;
  height: 90px;
}

.puyo-diff-pill {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(240, 194, 89, 0.15);
  border: 1px solid rgba(240, 194, 89, 0.45);
  color: #ffe99e;
  letter-spacing: 0.04em;
  text-transform: none;
}

/* Spirit Gauge + Spell Card Panel */
.puyo-spell-panel {
  --spell-accent: #e83b54;
  --spell-glow: #ffd480;
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.puyo-spell-panel.ready {
  border-color: var(--spell-glow);
  box-shadow:
    0 0 18px color-mix(in srgb, var(--spell-accent) 45%, transparent),
    inset 0 0 12px color-mix(in srgb, var(--spell-glow) 18%, transparent);
}

.puyo-spell-head {
  display: flex;
  align-items: center;
  gap: 7px;
}

.puyo-spell-emblem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(10, 6, 26, 0.72);
  border: 1px solid rgba(255, 232, 160, 0.3);
  flex-shrink: 0;
}

.puyo-spell-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
}

.puyo-spell-char {
  font-size: 12px;
  font-weight: 800;
  color: #fff6e0;
}

.puyo-spell-pct {
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--spell-glow);
}

.puyo-spirit-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: rgba(8, 5, 22, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.puyo-spirit-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--spell-accent), var(--spell-glow));
  transition: width 0.18s ease-out;
  box-shadow: 0 0 10px var(--spell-accent);
}

@keyframes puyoSpellPulse {
  0%, 100% {
    box-shadow: 0 0 10px color-mix(in srgb, var(--spell-accent) 60%, transparent);
    transform: translateY(0);
  }
  50% {
    box-shadow: 0 0 20px color-mix(in srgb, var(--spell-glow) 85%, transparent);
    transform: translateY(-1px);
  }
}

.puyo-spell-btn {
  appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(18, 12, 42, 0.85);
  color: rgba(235, 224, 255, 0.56);
  font-size: 12px;
  font-weight: 800;
  cursor: not-allowed;
  transition: transform 0.1s ease, filter 0.15s ease, border-color 0.2s ease, background 0.2s ease;
}

.puyo-spell-btn.ready {
  cursor: pointer;
  color: #fffdf5;
  border-color: var(--spell-glow);
  background: linear-gradient(135deg, var(--spell-accent), color-mix(in srgb, var(--spell-accent) 55%, #1d0c3a));
  animation: puyoSpellPulse 1.5s ease-in-out infinite;
}

.puyo-spell-btn.ready:hover {
  filter: brightness(1.12);
}

.puyo-spell-btn.ready:active {
  transform: scale(0.96);
}

.puyo-spell-btn-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.puyo-spell-btn-key {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.28);
  color: #fff2be;
  flex-shrink: 0;
}

/* Compact Chain / Speed / Boss Stage Pills */
.puyo-pills-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.puyo-pill-stat {
  background: linear-gradient(165deg, rgba(22, 15, 48, 0.9), rgba(13, 9, 32, 0.9));
  border: 1px solid rgba(245, 198, 96, 0.24);
  border-radius: 9px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.puyo-pill-stat.wide {
  grid-column: span 2;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.puyo-stat-k {
  font-size: 10px;
  color: rgba(235, 224, 255, 0.65);
  font-weight: 700;
  flex-shrink: 0;
}

.puyo-stat-v {
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fff8e7;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.puyo-stat-v.gold {
  color: #ffe27a;
}

.puyo-stat-v.chain {
  color: #ff8aa0;
}

/* Mobile / Touch Pad ONLY (never shown on standard desktop) */
.puyo-mobile-pad {
  display: none;
  width: 100%;
  max-width: 400px;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.puyo-stage.touch-pad .puyo-mobile-pad {
  display: flex;
}

.puyo-mobile-group {
  display: flex;
  gap: 5px;
}

.puyo-btn-ctrl {
  appearance: none;
  border: 1px solid rgba(240, 194, 89, 0.34);
  background: linear-gradient(180deg, rgba(45, 32, 86, 0.92), rgba(26, 18, 54, 0.95));
  color: #fff6e0;
  border-radius: 10px;
  width: 44px;
  height: 42px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  transition: transform 0.06s ease, background 0.12s ease, border-color 0.12s ease;
}

.puyo-btn-ctrl:active,
.puyo-btn-ctrl.pressed {
  transform: scale(0.93);
  background: linear-gradient(180deg, rgba(224, 62, 82, 0.78), rgba(152, 24, 44, 0.88));
  border-color: #ffe38f;
}

.puyo-btn-ctrl.accent {
  border-color: rgba(232, 59, 84, 0.55);
  background: linear-gradient(180deg, rgba(168, 30, 56, 0.88), rgba(105, 16, 36, 0.94));
}

.puyo-btn-ctrl.spell-mini {
  border-color: rgba(255, 255, 255, 0.2);
  opacity: 0.55;
}

.puyo-btn-ctrl.spell-mini.ready {
  opacity: 1;
  border-color: #ffe694;
  background: linear-gradient(135deg, #e83b54, #f5b82e);
  color: #190b28;
  box-shadow: 0 0 12px rgba(245, 184, 46, 0.75);
}

/* Overlays */
.puyo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 6, 24, 0.74);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 20;
  padding: 12px;
  box-sizing: border-box;
}

.puyo-overlay.hidden {
  display: none;
}

.puyo-modal {
  width: min(360px, 100%);
  max-height: 100%;
  overflow-y: auto;
  background: linear-gradient(160deg, rgba(28, 19, 58, 0.97), rgba(16, 11, 36, 0.98));
  border: 1.5px solid rgba(240, 194, 89, 0.56);
  border-radius: 16px;
  padding: 16px 16px 14px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.65),
    0 0 32px rgba(200, 35, 51, 0.24);
  text-align: center;
  box-sizing: border-box;
}

.puyo-modal.compact {
  width: min(320px, 100%);
  padding: 18px 16px 16px;
}

.puyo-modal-title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 900;
  background: linear-gradient(90deg, #fff6d1, #f5b82e, #ff7e96);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.puyo-modal-sub {
  margin: -6px 0 12px;
  font-size: 12px;
  color: rgba(235, 224, 255, 0.76);
}

.puyo-section-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: rgba(240, 194, 89, 0.85);
  text-align: left;
  margin: 0 0 5px 2px;
}

/* Mode Selector Pills */
.puyo-mode-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-bottom: 11px;
}

.puyo-mode-opt {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(14, 9, 32, 0.74);
  color: #e8ddf8;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.puyo-mode-opt:hover {
  border-color: rgba(240, 194, 89, 0.55);
}

.puyo-mode-opt.selected {
  border-color: #f5b82e;
  background: linear-gradient(135deg, rgba(224, 62, 82, 0.34), rgba(245, 184, 46, 0.22));
  color: #fff8e2;
  box-shadow: 0 0 14px rgba(245, 184, 46, 0.22);
}

.puyo-mode-badge {
  font-size: 9.5px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 999px;
  background: #e83b54;
  color: #fff;
}

.puyo-mode-badge.subtle {
  background: rgba(255, 255, 255, 0.14);
  color: #ffe8a3;
}

/* Compact Difficulty Pills */
.puyo-diff-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 11px;
}

.puyo-pill-opt {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 6px;
  border-radius: 9px;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(14, 9, 32, 0.72);
  color: #f3eaff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.puyo-pill-opt:hover {
  border-color: rgba(240, 194, 89, 0.55);
}

.puyo-pill-opt.selected {
  border-color: #f5b82e;
  background: linear-gradient(135deg, rgba(245, 184, 46, 0.24), rgba(155, 78, 230, 0.24));
  color: #fff9e3;
}

.puyo-pill-dot {
  font-size: 9px;
  font-weight: 900;
  padding: 1px 4px;
  border-radius: 999px;
  color: #130b24;
}

/* Compact Character Selector Pills */
.puyo-char-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-bottom: 14px;
}

.puyo-char-opt {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 5px 7px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(14, 9, 32, 0.74);
  color: #f8f1ff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.puyo-char-opt:hover {
  border-color: color-mix(in srgb, var(--char-accent) 70%, #fff);
  transform: translateY(-1px);
}

.puyo-char-opt.selected {
  border-color: var(--char-glow);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--char-accent) 34%, rgba(18, 10, 42, 0.92)),
    rgba(20, 12, 46, 0.92)
  );
  box-shadow: 0 0 14px color-mix(in srgb, var(--char-accent) 36%, transparent);
}

.puyo-char-emblem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
}

.puyo-char-name {
  font-size: 12.5px;
  font-weight: 900;
  color: #fff8e6;
}

.puyo-char-tag {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--char-glow);
  white-space: nowrap;
}

.puyo-action-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.puyo-cta {
  appearance: none;
  border: none;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  color: #fffdf7;
  background: linear-gradient(135deg, #e03e52, #b81d38);
  box-shadow: 0 6px 18px rgba(224, 62, 82, 0.42);
  transition: transform 0.1s ease, filter 0.15s ease;
  flex: 1;
  min-width: 112px;
}

.puyo-cta:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.puyo-cta:active {
  transform: translateY(0);
}

.puyo-cta.secondary {
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(240, 194, 89, 0.36);
  box-shadow: none;
  color: #ffe8a3;
}

.puyo-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 10px 0 14px;
}

.puyo-summary-item {
  background: rgba(11, 7, 26, 0.72);
  border: 1px solid rgba(240, 194, 89, 0.2);
  border-radius: 10px;
  padding: 8px;
}

.puyo-new-badge {
  display: inline-block;
  margin-left: 5px;
  padding: 2px 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f5b82e, #ff7043);
  color: #160c26;
  font-size: 10px;
  font-weight: 900;
  vertical-align: middle;
}

/* Compact / mobile mode */
.puyo-stage.compact .puyo-main {
  gap: 8px;
}

.puyo-stage.compact .puyo-sidebar {
  width: 104px;
  gap: 6px;
}

.puyo-stage.compact .puyo-panel {
  padding: 6px 7px;
}

.puyo-stage.compact .puyo-preview-canvas {
  height: 72px;
}

.puyo-stage.compact .puyo-spell-emblem {
  width: 22px;
  height: 22px;
}

.puyo-stage.compact .puyo-spell-btn {
  padding: 5px 6px;
  font-size: 10.5px;
}

.puyo-stage.compact .puyo-spell-btn-key {
  display: none;
}

.puyo-stage.compact .puyo-pills-panel {
  grid-template-columns: 1fr;
  gap: 4px;
}

.puyo-stage.compact .puyo-pill-stat.wide {
  grid-column: span 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.puyo-stage.compact .puyo-stat-v {
  font-size: 12px;
}
`;
