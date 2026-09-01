import React from "react";

interface CommonSettingsProps {
  isEnabledCollisionDetect: boolean;
  isUserInGame: boolean;
  indexesVisible: boolean;
  needFillEmptyGraphsCells: boolean;
  isLoggerEnabled: boolean;
  customCodeIsEnabled: boolean;
  fps: number;
  onToggleCollision: () => void;
  onToggleUserInGame: () => void;
  onToggleIndexesVisible: () => void;
  onToggleFillEmptyCells: () => void;
  onToggleLogger: () => void;
  onToggleCustomCode: () => void;
  onChangeFps: (fps: number) => void;
}

export const CommonSettings: React.FC<CommonSettingsProps> = ({
  isEnabledCollisionDetect,
  isUserInGame,
  indexesVisible,
  needFillEmptyGraphsCells,
  isLoggerEnabled,
  customCodeIsEnabled,
  fps,
  onToggleCollision,
  onToggleUserInGame,
  onToggleIndexesVisible,
  onToggleFillEmptyCells,
  onToggleLogger,
  onToggleCustomCode,
  onChangeFps,
}) => {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold mb-2 pb-1 border-b border-neutral-700 text-neutral-200">
        Common Settings
      </h3>
      <div className="space-y-2 text-xs text-neutral-300">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isEnabledCollisionDetect}
            onChange={onToggleCollision}
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span>handle collision state</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isUserInGame}
            onChange={onToggleUserInGame}
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span>add user (you) to game</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={indexesVisible}
            onChange={onToggleIndexesVisible}
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span>visible indexes</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={needFillEmptyGraphsCells}
            onChange={onToggleFillEmptyCells}
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span>fill graph's empty cells</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isLoggerEnabled}
            onChange={onToggleLogger}
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span>show operations count in console</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={customCodeIsEnabled}
            onChange={onToggleCustomCode}
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span>If it it enabled - your code will run</span>
        </label>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min={1}
            max={120}
            step={2}
            value={fps}
            onChange={(e) => onChangeFps(parseInt(e.target.value) || 15)}
            className="w-16 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-center font-bold focus:outline-none focus:border-emerald-500"
          />
          <span className="font-semibold text-neutral-400">FPS</span>
        </div>
      </div>
    </div>
  );
};
