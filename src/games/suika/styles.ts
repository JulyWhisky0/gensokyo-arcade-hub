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
  max-width: 800px;
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

.suika-canvas.yukari-pick {
  cursor: pointer;
}

/* Ultra-Clean 3-Module Sidebar */
.suika-sidebar {
  flex: 0 0 218px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  max-height: 100%;
}

.suika-card {
  position: relative;
  background: linear-gradient(180deg, rgba(35, 24, 62, 0.94), rgba(19, 14, 38, 0.96));
  border: 1px solid rgba(240, 194, 89, 0.3);
  border-radius: 14px;
  padding: 10px 11px;
  box-shadow:
    0 8px 22px rgba(5, 3, 16, 0.48),
    inset 0 1px 0 rgba(255, 232, 168, 0.12);
  box-sizing: border-box;
}

.suika-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: #f5ca64;
  font-weight: 700;
  margin-bottom: 7px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(240, 194, 89, 0.14);
}

/* Module 1: Twin Next + Gap Hold Slots */
.suika-slots-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.suika-slot-box {
  position: relative;
  height: 76px;
  border-radius: 11px;
  background: radial-gradient(circle at 50% 48%, rgba(245, 202, 100, 0.12), rgba(12, 8, 26, 0.78));
  border: 1px solid rgba(240, 194, 89, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 4px 4px;
  box-sizing: border-box;
}

.suika-slot-tag {
  position: absolute;
  top: 4px;
  left: 7px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #f5ca64;
  line-height: 1;
}

.suika-slot-tag.gap {
  color: #d6a3ff;
}

.suika-slot-canvas {
  width: 46px;
  height: 46px;
  display: block;
}

.suika-gap-slot {
  font-family: inherit;
  cursor: pointer;
  background: radial-gradient(circle at 50% 48%, rgba(155, 93, 229, 0.22), rgba(16, 8, 34, 0.84));
  border: 1px solid rgba(186, 130, 255, 0.42);
  transition: transform 0.12s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.suika-gap-slot.ready:hover {
  border-color: rgba(247, 213, 114, 0.85);
  box-shadow: 0 0 14px rgba(178, 114, 255, 0.34);
  transform: translateY(-1px);
}

.suika-gap-slot.ready:active {
  transform: scale(0.97);
}

.suika-gap-slot.cooldown {
  opacity: 0.56;
  cursor: default;
  border-color: rgba(186, 130, 255, 0.2);
}

.suika-gap-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  opacity: 0.72;
  filter: drop-shadow(0 0 6px rgba(196, 138, 255, 0.55));
}

.suika-gap-badge {
  position: absolute;
  bottom: 4px;
  right: 5px;
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 700;
  background: rgba(155, 93, 229, 0.34);
  border: 1px solid rgba(214, 163, 255, 0.42);
  color: #f3e4ff;
  line-height: 1.2;
}

.suika-gap-slot.cooldown .suika-gap-badge {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #b7add1;
}

/* Module 2: Spirit Gauge + 4-Icon Support Selector + Spell Cast */
.suika-spell-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.suika-spell-heading {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #ffdf85;
}

.suika-charge-pips {
  display: flex;
  align-items: center;
  gap: 5px;
}

.suika-pip {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(240, 194, 89, 0.35);
  transition: background 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.suika-pip.filled {
  background: radial-gradient(circle at 35% 35%, #fff6cc, #ff596e 72%);
  border-color: #ffe380;
  box-shadow: 0 0 9px rgba(255, 118, 128, 0.78);
  transform: scale(1.1);
}

.suika-gauge-track {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-bottom: 9px;
}

.suika-gauge-seg {
  height: 8px;
  border-radius: 999px;
  background: rgba(10, 7, 24, 0.8);
  border: 1px solid rgba(240, 194, 89, 0.24);
  overflow: hidden;
}

.suika-gauge-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(90deg, #e63950, #ff8f52, #ffe270);
  transition: width 0.22s ease;
}

.suika-support-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  margin-bottom: 8px;
}

.suika-support-btn {
  padding: 3px;
  border-radius: 10px;
  background: rgba(12, 8, 28, 0.65);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.16s ease, border-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
}

.suika-support-btn:hover {
  opacity: 0.96;
  border-color: rgba(240, 194, 89, 0.45);
}

.suika-support-btn.active {
  opacity: 1;
  background: linear-gradient(135deg, rgba(245, 202, 98, 0.22), rgba(214, 48, 72, 0.18));
  border-color: #ffe07d;
  box-shadow: 0 0 11px rgba(245, 202, 98, 0.34);
  transform: translateY(-1px);
}

.suika-support-canvas {
  width: 34px;
  height: 34px;
  display: block;
}

.suika-cast-btn {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 7px 10px;
  background: rgba(14, 10, 30, 0.72);
  color: #a69cc2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-family: inherit;
  cursor: not-allowed;
  transition: transform 0.12s ease, filter 0.16s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.suika-cast-btn.ready {
  cursor: pointer;
  color: #ffffff;
  border-color: rgba(255, 228, 128, 0.72);
  background: linear-gradient(135deg, var(--spell-color, #e6394d), rgba(54, 24, 72, 0.92));
  box-shadow: 0 4px 16px rgba(230, 57, 77, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.suika-cast-btn.ready:hover {
  filter: brightness(1.1);
}

.suika-cast-btn.ready:active {
  transform: scale(0.98);
}

.suika-cast-btn.picking {
  background: linear-gradient(135deg, #8b46eb, #4c1d85);
  border-color: #f7d572;
  box-shadow: 0 0 16px rgba(178, 114, 255, 0.56);
}

.suika-cast-name {
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suika-cast-key {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.28);
  color: #ffe8a3;
}

/* Module 3: Icon-Only Fumo Fruit Evolution Strip */
.suika-evo-card {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.suika-evo-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  align-content: start;
}

.suika-evo-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 10px;
  background: rgba(12, 9, 28, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0.44;
  transition: opacity 0.22s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease, transform 0.18s ease;
}

.suika-evo-chip.reached {
  opacity: 0.96;
  background: linear-gradient(135deg, rgba(240, 194, 89, 0.14), rgba(200, 35, 51, 0.08));
  border-color: rgba(240, 194, 89, 0.34);
}

.suika-evo-chip.highest {
  opacity: 1;
  background: linear-gradient(135deg, rgba(46, 184, 107, 0.3), rgba(240, 194, 89, 0.22));
  border-color: rgba(102, 240, 162, 0.8);
  box-shadow: 0 0 12px rgba(94, 230, 156, 0.3);
  transform: scale(1.04);
}

.suika-evo-chip.tier-suika {
  grid-column: span 2;
  background: linear-gradient(90deg, rgba(30, 128, 72, 0.18), rgba(240, 194, 89, 0.14));
  border-color: rgba(240, 194, 89, 0.26);
}

.suika-evo-chip.tier-suika.highest {
  background: linear-gradient(90deg, rgba(46, 184, 107, 0.4), rgba(245, 202, 98, 0.32));
  border-color: rgba(255, 228, 112, 0.88);
  box-shadow: 0 0 16px rgba(94, 230, 156, 0.4);
}

.suika-evo-icon {
  width: 28px;
  height: 28px;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.36));
}

.suika-evo-chip.tier-suika .suika-evo-icon {
  width: 34px;
  height: 34px;
}

/* Overlays inside canvas shell (CRITICAL: preserves .suika-overlay.visible contract) */
.suika-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(12, 8, 26, 0.74);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.suika-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

.suika-modal {
  width: 100%;
  max-width: 300px;
  background: linear-gradient(180deg, rgba(39, 25, 68, 0.97), rgba(19, 14, 40, 0.98));
  border: 1.5px solid rgba(240, 194, 89, 0.56);
  border-radius: 18px;
  padding: 18px 18px 16px;
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
  font-size: 21px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.suika-trophy-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
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
  transition: transform 0.12s ease, filter 0.15s ease;
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

/* Compact / Mobile Responsive Mode */
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
    flex-wrap: wrap;
    align-items: stretch;
    gap: 6px;
  }

  .suika-card {
    padding: 5px 7px;
    border-radius: 10px;
  }

  .suika-card-header {
    display: none;
  }

  .suika-slots-card {
    flex: 0 0 auto;
  }

  .suika-slots-row {
    gap: 5px;
  }

  .suika-slot-box {
    width: 54px;
    height: 52px;
    padding: 8px 2px 2px;
  }

  .suika-slot-canvas {
    width: 34px;
    height: 34px;
  }

  .suika-gap-badge {
    display: none;
  }

  .suika-spell-card {
    flex: 1 1 190px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }

  .suika-spell-top {
    margin-bottom: 0;
  }

  .suika-gauge-track {
    margin-bottom: 0;
  }

  .suika-support-picker {
    margin-bottom: 0;
    gap: 4px;
  }

  .suika-support-canvas {
    width: 24px;
    height: 24px;
  }

  .suika-cast-btn {
    padding: 4px 8px;
  }

  .suika-cast-name {
    font-size: 11px;
  }

  .suika-evo-card {
    flex: 1 1 100%;
    padding: 4px 6px;
  }

  .suika-evo-strip {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
  }

  .suika-evo-chip,
  .suika-evo-chip.tier-suika {
    padding: 2px;
    border-radius: 7px;
    flex: 0 1 auto;
  }

  .suika-evo-icon,
  .suika-evo-chip.tier-suika .suika-evo-icon {
    width: 20px;
    height: 20px;
  }
}
`;
