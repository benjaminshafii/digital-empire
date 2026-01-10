import React from "react";

interface RoomConfig {
  couchLength: number;
  couchWidth: number;
  hallwayWidth: number;
  doorWidth: number;
  hallwayLength: number;
  roomWidth: number;
  roomDepth: number;
}

interface ControlsProps {
  config: RoomConfig;
  onConfigChange: (config: RoomConfig) => void;
  onPlan: () => void;
  onAnimate: () => void;
  onReset: () => void;
  isPlanning: boolean;
  isAnimating: boolean;
  canAnimate: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  config,
  onConfigChange,
  onPlan,
  onAnimate,
  onReset,
  isPlanning,
  isAnimating,
  canAnimate,
}) => {
  const handleChange = (key: keyof RoomConfig, value: string) => {
    onConfigChange({
      ...config,
      [key]: parseFloat(value),
    });
  };

  return (
    <div className="controls">
      <h1>Sofa Pivot Simulator</h1>

      <div className="control-group">
        <label>Couch Length</label>
        <div className="input-row">
          <input
            type="range"
            min="1.0"
            max="3.5"
            step="0.05"
            value={config.couchLength}
            onChange={(e) => handleChange("couchLength", e.target.value)}
          />
          <span className="value-display">{config.couchLength.toFixed(2)}m</span>
        </div>
      </div>

      <div className="control-group">
        <label>Couch Width</label>
        <div className="input-row">
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={config.couchWidth}
            onChange={(e) => handleChange("couchWidth", e.target.value)}
          />
          <span className="value-display">{config.couchWidth.toFixed(2)}m</span>
        </div>
      </div>

      <h2>Environment</h2>

      <div className="control-group">
        <label>Hallway Width</label>
        <div className="input-row">
          <input
            type="range"
            min="0.7"
            max="2.0"
            step="0.05"
            value={config.hallwayWidth}
            onChange={(e) => handleChange("hallwayWidth", e.target.value)}
          />
          <span className="value-display">{config.hallwayWidth.toFixed(2)}m</span>
        </div>
      </div>

      <div className="control-group">
        <label>Door Width</label>
        <div className="input-row">
          <input
            type="range"
            min="0.6"
            max="1.2"
            step="0.01"
            value={config.doorWidth}
            onChange={(e) => handleChange("doorWidth", e.target.value)}
          />
          <span className="value-display">{config.doorWidth.toFixed(2)}m</span>
        </div>
      </div>

      <div className="control-group">
        <label>Hallway Length</label>
        <div className="input-row">
          <input
            type="range"
            min="2.0"
            max="6.0"
            step="0.5"
            value={config.hallwayLength}
            onChange={(e) => handleChange("hallwayLength", e.target.value)}
          />
          <span className="value-display">{config.hallwayLength.toFixed(2)}m</span>
        </div>
      </div>

      <div className="control-group">
        <label>Room Width</label>
        <div className="input-row">
          <input
            type="range"
            min="2.0"
            max="5.0"
            step="0.5"
            value={config.roomWidth}
            onChange={(e) => handleChange("roomWidth", e.target.value)}
          />
          <span className="value-display">{config.roomWidth.toFixed(2)}m</span>
        </div>
      </div>

      <div className="control-group">
        <label>Room Depth</label>
        <div className="input-row">
          <input
            type="range"
            min="2.0"
            max="5.0"
            step="0.5"
            value={config.roomDepth}
            onChange={(e) => handleChange("roomDepth", e.target.value)}
          />
          <span className="value-display">{config.roomDepth.toFixed(2)}m</span>
        </div>
      </div>

      <h2>Actions</h2>

      <button onClick={onPlan} disabled={isPlanning}>
        {isPlanning ? "Planning..." : "Find Path"}
      </button>

      <button
        onClick={onAnimate}
        disabled={isAnimating || !canAnimate}
        className="secondary"
      >
        {isAnimating ? "Animating..." : "Animate Path"}
      </button>

      <button onClick={onReset} className="secondary">
        Reset
      </button>

      <div className="legend">
        <div className="legend-item">
          <div className="color-box" style={{ background: "#ff6b6b" }}></div>
          <span>Hallway / Room Walls</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: "#3b82f6" }}></div>
          <span>Couch</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: "#22c55e" }}></div>
          <span>Planned Path</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ background: "#22c55e", opacity: 0.3 }}></div>
          <span>Target Room Area</span>
        </div>
      </div>
    </div>
  );
};
