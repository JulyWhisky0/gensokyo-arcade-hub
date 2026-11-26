export const SUIKA_STYLES = `
.suika-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  box-sizing: border-box;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
  color: #f6effc;
}

.suika-layout {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 14px;
  width: 100%;
  height: 100%;
  max-width: 820px;
  max-height: 100%;
  min-height: 0;
}

.suika-stage-col {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suika-canvas-shell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  box-shadow:
    0 18px 44px rgba(8, 3, 20, 0.72),
    0 0 0 1.5px rgba(240, 194, 89, 0.36),
    0 0 28px rgba(200, 35, 51, 0.14),
    inset 0 0 28px rgba(240, 194, 89, 0.08);
  background: radial-gradient(circle at 50% 24%, rgba(50, 32, 86, 0.88), rgba(16, 11, 34, 0.98));
  overflow: hidden;
}

.suika-canvas {
  display: block;
  touch-action: none;
  cursor: crosshair;
}

/* Side panel (desktop) */
.suika-sidebar {
  flex: 0 0 228px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  max-height: 100%;
}

.suika-card {
  position: relative;
  background: linear-gradient(180deg, rgba(35, 24, 62, 0.94), rgba(19, 14, 38, 0.96));
  border: 1px solid rgba(240, 194, 89, 0.32);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow:
    0 8px 22px rgba(5, 3, 16, 0.48),
    inset 0 1px 0 rgba(255, 232, 168, 0.12);
  box-sizing: border-box;
}

.suika-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f5ca64;
  font-weight: 700;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(240, 194, 89, 0.14);
}

.suika-next-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.suika-next-canvas-box {
  width: 62px;
  height: 62px;
  flex: 0 0 62px;
  border-radius: 12px;
  background: radial-gradient(circle at 50% 42%, rgba(245, 202, 100, 0.14), rgba(12, 8, 26, 0.72));
  border: 1px solid rgba(240, 194, 89, 0.3);
  box-shadow: inset 0 0 14px rgba(240, 194, 89, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.suika-next-canvas-box canvas {
  width: 48px;
  height: 48px;
  display: block;
}

.suika-next-info {
  min-width: 0;
  flex: 1;
}

.suika-next-name {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.25;
}

.suika-next-sub {
  font-size: 11px;
  color: #cec4e6;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suika-mini-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.suika-stat-box {
  background: linear-gradient(180deg, rgba(14, 10, 30, 0.62), rgba(10, 7, 22, 0.72));
  border: 1px solid rgba(240, 194, 89, 0.14);
  border-radius: 10px;
  padding: 6px 8px;
  text-align: center;
}

.suika-stat-label {
  font-size: 10px;
  color: #b4a9d1;
}

.suika-stat-val {
  font-size: 16px;
  font-weight: 800;
  color: #fff6dc;
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
}

.suika-stat-val.accent {
  color: #63ed9f;
}

/* Refined Shrine Evolution Chain */
.suika-evo-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.suika-evo-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  flex: 1 1 auto;
  min-height: 0;
  align-content: start;
  overflow: hidden;
}

.suika-evo-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 9px;
  background: rgba(12, 9, 28, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0.52;
  transition: opacity 0.22s ease, border-color 0.22s ease, background 0.22s ease, transform 0.2s ease, box-shadow 0.22s ease;
}

.suika-evo-item.reached {
  opacity: 0.96;
  background: linear-gradient(135deg, rgba(240, 194, 89, 0.13), rgba(200, 35, 51, 0.08));
  border-color: rgba(240, 194, 89, 0.36);
}

.suika-evo-item.highest {
  opacity: 1;
  background: linear-gradient(135deg, rgba(46, 184, 107, 0.28), rgba(240, 194, 89, 0.22));
  border-color: rgba(102, 240, 162, 0.72);
  box-shadow: 0 0 12px rgba(94, 230, 156, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transform: translateY(-0.5px);
}

.suika-evo-item.tier-suika {
  grid-column: 1 / -1;
  justify-content: center;
  padding: 4px 8px;
  background: linear-gradient(90deg, rgba(30, 128, 72, 0.16), rgba(240, 194, 89, 0.14), rgba(200, 35, 51, 0.14));
  border-color: rgba(240, 194, 89, 0.24);
}

.suika-evo-item.tier-suika.highest {
  background: linear-gradient(90deg, rgba(46, 184, 107, 0.38), rgba(245, 202, 98, 0.32), rgba(235, 58, 92, 0.24));
  border-color: rgba(255, 228, 112, 0.85);
  box-shadow: 0 0 16px rgba(94, 230, 156, 0.36);
}

.suika-evo-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
}

.suika-evo-item.tier-suika .suika-evo-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
}

.suika-evo-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.12;
}

.suika-evo-name {
  font-size: 11px;
  font-weight: 700;
  color: #f8f2ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suika-evo-pts {
  font-size: 9px;
  color: #f5ca64;
  opacity: 0.9;
}

.suika-controls-hint {
  font-size: 11px;
  color: #c2b8de;
  line-height: 1.45;
  text-align: center;
  padding-top: 2px;
}

.suika-kbd {
  display: inline-block;
  padding: 1px 5px;
  margin: 0 1px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(240, 194, 89, 0.24);
  font-size: 10px;
  color: #fff3cc;
}

/* Overlays inside canvas shell (preserves .suika-overlay.visible convention) */
.suika-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(12, 8, 26, 0.76);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
}

.suika-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

.suika-modal {
  width: 100%;
  max-width: 316px;
  background: linear-gradient(180deg, rgba(39, 25, 68, 0.97), rgba(19, 14, 40, 0.98));
  border: 1.5px solid rgba(240, 194, 89, 0.58);
  border-radius: 18px;
  padding: 20px 18px 18px;
  text-align: center;
  box-shadow:
    0 20px 46px rgba(0, 0, 0, 0.68),
    0 0 28px rgba(240, 194, 89, 0.16),
    inset 0 1px 0 rgba(255, 232, 168, 0.18);
}

.suika-modal-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  background: rgba(204, 34, 54, 0.3);
  border: 1px solid rgba(240, 194, 89, 0.5);
  color: #ffde85;
  margin-bottom: 8px;
}

.suika-modal-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.suika-modal-sub {
  margin: 6px 0 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #d3caeb;
}

.suika-trophy-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 10px 0 12px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(12, 9, 26, 0.6);
  border: 1px solid rgba(240, 194, 89, 0.28);
}

.suika-trophy-canvas {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  display: block;
}

.suika-trophy-text {
  text-align: left;
  min-width: 0;
}

.suika-trophy-label {
  font-size: 10px;
  color: #f5ca64;
  font-weight: 700;
}

.suika-trophy-name {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
}

.suika-trophy-epithet {
  font-size: 11px;
  color: #c7bce3;
}

.suika-score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}

.suika-score-tile {
  padding: 8px;
  border-radius: 10px;
  background: rgba(10, 8, 22, 0.62);
  border: 1px solid rgba(240, 194, 89, 0.14);
}

.suika-score-tile-label {
  font-size: 11px;
  color: #b1a6cf;
}

.suika-score-tile-val {
  font-size: 20px;
  font-weight: 800;
  color: #fff6dc;
  font-variant-numeric: tabular-nums;
}

.suika-new-record {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #e03e52;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}

.suika-btn-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.suika-btn {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
}

.suika-btn:active {
  transform: scale(0.97);
}

.suika-btn-primary {
  background: linear-gradient(135deg, #2ebd6e, #1b8c4e);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(34, 158, 87, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.suika-btn-primary:hover {
  filter: brightness(1.08);
}

.suika-btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #efe8fb;
  border: 1px solid rgba(240, 194, 89, 0.34);
}

.suika-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.16);
}

/* Mobile / Compact Responsive Mode */
@media (max-width: 720px), (max-height: 540px) {
  .suika-root {
    padding: 6px 8px;
  }

  .suika-layout {
    flex-direction: column-reverse;
    gap: 6px;
    align-items: center;
  }

  .suika-stage-col {
    width: 100%;
    flex: 1 1 auto;
  }

  .suika-sidebar {
    flex: 0 0 auto;
    width: 100%;
    max-width: 440px;
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }

  .suika-card {
    padding: 5px 8px;
    border-radius: 10px;
  }

  .suika-card-header {
    display: none;
  }

  .suika-next-card {
    flex: 0 0 auto;
  }

  .suika-next-canvas-box {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 8px;
  }

  .suika-next-canvas-box canvas {
    width: 32px;
    height: 32px;
  }

  .suika-next-name {
    font-size: 12px;
  }

  .suika-next-sub {
    display: none;
  }

  .suika-stats-card,
  .suika-controls-hint {
    display: none;
  }

  .suika-evo-card {
    flex: 1 1 auto;
    min-width: 0;
    padding: 4px 6px;
  }

  .suika-evo-list {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    overflow: hidden;
  }

  .suika-evo-item,
  .suika-evo-item.tier-suika {
    padding: 2px;
    gap: 0;
    border-radius: 6px;
    flex: 0 1 auto;
  }

  .suika-evo-icon,
  .suika-evo-item.tier-suika .suika-evo-icon {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
  }

  .suika-evo-meta {
    display: none;
  }
}
`;
