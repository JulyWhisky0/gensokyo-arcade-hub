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
  padding: 8px;
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

.puyo-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 184px;
  flex-shrink: 0;
  max-height: 100%;
}

.puyo-panel {
  background: linear-gradient(165deg, rgba(24, 16, 52, 0.92), rgba(14, 10, 34, 0.92));
  border: 1px solid rgba(245, 198, 96, 0.34);
  border-radius: 11px;
  padding: 8px 10px;
  box-shadow:
    0 6px 16px rgba(5, 2, 18, 0.38),
    inset 0 1px 0 rgba(255, 240, 196, 0.1);
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
  height: 92px;
}

.puyo-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.puyo-stat-box {
  background: rgba(11, 7, 26, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 7px;
  padding: 5px 7px;
  min-width: 0;
}

.puyo-stat-box.wide {
  grid-column: span 2;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.puyo-stat-k {
  font-size: 10px;
  color: rgba(235, 224, 255, 0.66);
  font-weight: 600;
}

.puyo-stat-v {
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fff8e7;
  line-height: 1.2;
}

.puyo-stat-v.gold {
  color: #ffe27a;
}

.puyo-stat-v.chain {
  color: #ff8aa0;
}

.puyo-diff-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(240, 194, 89, 0.16);
  border: 1px solid rgba(240, 194, 89, 0.45);
  color: #ffe99e;
}

.puyo-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.puyo-btn-ctrl {
  appearance: none;
  border: 1px solid rgba(240, 194, 89, 0.34);
  background: linear-gradient(180deg, rgba(45, 32, 86, 0.92), rgba(26, 18, 54, 0.95));
  color: #fff6e0;
  border-radius: 8px;
  height: 34px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  transition: transform 0.06s ease, background 0.12s ease, border-color 0.12s ease;
}

.puyo-btn-ctrl:hover {
  border-color: rgba(240, 194, 89, 0.72);
  background: linear-gradient(180deg, rgba(64, 44, 118, 0.95), rgba(35, 23, 72, 0.95));
}

.puyo-btn-ctrl:active,
.puyo-btn-ctrl.pressed {
  transform: scale(0.94);
  background: linear-gradient(180deg, rgba(224, 62, 82, 0.75), rgba(152, 24, 44, 0.85));
  border-color: #ffe38f;
}

.puyo-btn-ctrl.accent {
  border-color: rgba(232, 59, 84, 0.52);
  background: linear-gradient(180deg, rgba(168, 30, 56, 0.88), rgba(105, 16, 36, 0.94));
}

.puyo-keys-hint {
  font-size: 10px;
  line-height: 1.45;
  color: rgba(224, 212, 248, 0.68);
}

.puyo-keys-hint kbd {
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #ffe89e;
  font-size: 9.5px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.puyo-mobile-pad {
  display: none;
  width: 100%;
  max-width: 390px;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.puyo-mobile-group {
  display: flex;
  gap: 6px;
}

.puyo-mobile-pad .puyo-btn-ctrl {
  width: 48px;
  height: 44px;
  font-size: 16px;
  border-radius: 10px;
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
  width: min(370px, 100%);
  max-height: 100%;
  overflow-y: auto;
  background: linear-gradient(160deg, rgba(28, 19, 58, 0.97), rgba(16, 11, 36, 0.98));
  border: 1.5px solid rgba(240, 194, 89, 0.56);
  border-radius: 16px;
  padding: 18px 18px 16px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.65),
    0 0 32px rgba(200, 35, 51, 0.24);
  text-align: center;
  box-sizing: border-box;
}

.puyo-modal-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: #f0c259;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.puyo-modal-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 900;
  background: linear-gradient(90deg, #fff6d1, #f5b82e, #ff7e96);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.puyo-modal-sub {
  margin: 0 0 12px;
  font-size: 12px;
  color: rgba(235, 224, 255, 0.78);
  line-height: 1.45;
}

.puyo-orb-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.puyo-orb-chip {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  box-shadow: inset -3px -3px 6px rgba(0, 0, 0, 0.35), 0 0 10px rgba(255, 255, 255, 0.18);
}

.puyo-diff-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 14px;
  text-align: left;
}

.puyo-diff-opt {
  appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.14);
  background: rgba(14, 9, 32, 0.72);
  color: #f8f1ff;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.puyo-diff-opt:hover {
  border-color: rgba(240, 194, 89, 0.55);
  background: rgba(34, 22, 68, 0.85);
}

.puyo-diff-opt.selected {
  border-color: #f5b82e;
  background: linear-gradient(90deg, rgba(200, 35, 51, 0.28), rgba(245, 184, 46, 0.22));
  box-shadow: 0 0 16px rgba(245, 184, 46, 0.2);
}

.puyo-diff-title {
  font-size: 13px;
  font-weight: 800;
  color: #fff6dd;
}

.puyo-diff-desc {
  font-size: 11px;
  color: rgba(225, 214, 248, 0.72);
  margin-top: 2px;
}

.puyo-diff-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 7px;
  border-radius: 999px;
  color: #120c26;
  flex-shrink: 0;
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
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  color: #fffdf7;
  background: linear-gradient(135deg, #e03e52, #b81d38);
  box-shadow: 0 6px 18px rgba(224, 62, 82, 0.42);
  transition: transform 0.1s ease, filter 0.15s ease;
  flex: 1;
  min-width: 120px;
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
  margin: 12px 0 14px;
}

.puyo-summary-item {
  background: rgba(11, 7, 26, 0.72);
  border: 1px solid rgba(240, 194, 89, 0.2);
  border-radius: 10px;
  padding: 8px;
}

.puyo-new-badge {
  display: inline-block;
  margin-left: 6px;
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
  width: 106px;
  gap: 6px;
}

.puyo-stage.compact .puyo-panel {
  padding: 6px 7px;
}

.puyo-stage.compact .puyo-preview-canvas {
  height: 76px;
}

.puyo-stage.compact .puyo-stats-grid {
  grid-template-columns: 1fr;
  gap: 4px;
}

.puyo-stage.compact .puyo-stat-box.wide {
  grid-column: span 1;
  flex-direction: column;
  align-items: flex-start;
}

.puyo-stage.compact .puyo-stat-v {
  font-size: 13px;
}

.puyo-stage.compact .puyo-desktop-pad,
.puyo-stage.compact .puyo-desktop-keys {
  display: none;
}

.puyo-stage.compact .puyo-mobile-pad {
  display: flex;
}
`;
