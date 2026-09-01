import React from "react";
import type { Snake } from "@separa/example-snake-shared";

interface ScoreBoardProps {
  snakes: Snake[];
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ snakes }) => {
  return (
    <div className="mb-4">
      <h3 className="text-base font-bold mb-2 pb-1 border-b border-neutral-700 text-neutral-200">
        Score board
      </h3>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {snakes.map((snake) => (
          <li
            key={snake.id}
            className={`relative flex items-center justify-between px-2 py-1 rounded bg-neutral-900/60 border border-neutral-800 ${
              snake.isCrash ? "line-through opacity-70" : ""
            }`}
            style={{ color: snake.colors.head }}
          >
            {snake.isCrash && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 text-red-200 font-bold text-xs rounded z-10">
                Dropped out !
              </div>
            )}
            <span className="font-semibold text-xs tracking-wide">{snake.id}</span>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
              {snake.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
