import React from "react";
import type { Snake, SnakeSettings } from "@separa/example-snake-shared";
import { algorithms, heuristics } from "@separa/example-snake-shared";

interface SnakeSettingsItemProps {
  snake: Snake;
  onUpdateSettings: (snakeId: string, settings: Partial<SnakeSettings>) => void;
  onRemoveSnake: (snakeId: string) => void;
}

export const SnakeSettingsItem: React.FC<SnakeSettingsItemProps> = ({
  snake,
  onUpdateSettings,
  onRemoveSnake,
}) => {
  const currentAlgo = algorithms.find((a) => a.id === snake.settings.activeAlgorithm);

  return (
    <div className="mb-3 p-2.5 rounded bg-neutral-900/80 border border-neutral-800 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold tracking-wide" style={{ color: snake.colors.head }}>
          Settings for {snake.id}
        </h4>
        <button
          onClick={() => onRemoveSnake(snake.id)}
          className="text-neutral-400 hover:text-red-400 p-0.5 rounded transition-colors text-sm font-bold"
          title="Remove snake"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-neutral-300 select-none">
          <input
            type="checkbox"
            checked={snake.settings.showAIPathToTarget}
            disabled={snake.isCrash}
            onChange={(e) =>
              onUpdateSettings(snake.id, { showAIPathToTarget: e.target.checked })
            }
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span style={{ color: snake.colors.tail }}>Show ai path to target</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-neutral-300 select-none">
          <input
            type="checkbox"
            checked={snake.settings.showProcessedCells}
            disabled={snake.isCrash}
            onChange={(e) =>
              onUpdateSettings(snake.id, { showProcessedCells: e.target.checked })
            }
            className="rounded border-neutral-700 bg-neutral-800 text-emerald-500"
          />
          <span style={{ color: snake.colors.tail }}>Show processed cells</span>
        </label>

        <div className="flex flex-col gap-1.5 pt-1">
          <select
            value={snake.settings.activeAlgorithm}
            disabled={snake.isCrash}
            onChange={(e) =>
              onUpdateSettings(snake.id, { activeAlgorithm: e.target.value })
            }
            className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-emerald-500 text-xs"
          >
            {algorithms.map((alg) => (
              <option key={alg.id} value={alg.id}>
                {alg.name}
              </option>
            ))}
          </select>

          {currentAlgo?.hasHeuristic && (
            <select
              value={snake.settings.activeHeuristic}
              disabled={snake.isCrash}
              onChange={(e) =>
                onUpdateSettings(snake.id, { activeHeuristic: e.target.value })
              }
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:border-emerald-500 text-xs"
            >
              {heuristics.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};
