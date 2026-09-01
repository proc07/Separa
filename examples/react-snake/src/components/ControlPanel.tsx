import React from "react";
import { GAME_STATE } from "@separa/example-snake-shared";

interface ControlPanelProps {
  gameState: GAME_STATE;
  isVisibleBoard: boolean;
  onTogglePlayPause: () => void;
  onRestart: () => void;
  onAddSnake: () => void;
  onToggleBoardVisible: () => void;
  onOpenEditor: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gameState,
  isVisibleBoard,
  onTogglePlayPause,
  onRestart,
  onAddSnake,
  onToggleBoardVisible,
  onOpenEditor,
}) => {
  const isPlay = gameState === GAME_STATE.IS_PLAY;

  return (
    <div className="mt-3 p-3 rounded-lg bg-neutral-950/80 backdrop-blur border border-neutral-800 shadow-xl flex flex-wrap gap-2">
      <button
        onClick={onTogglePlayPause}
        className="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      >
        {isPlay ? "pause" : "play"}
      </button>

      <button
        onClick={onRestart}
        className="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      >
        restart
      </button>

      <button
        onClick={onAddSnake}
        className="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      >
        add snake
      </button>

      <button
        onClick={onToggleBoardVisible}
        className="px-3 py-1.5 rounded text-xs font-semibold bg-neutral-200/80 text-neutral-950 hover:bg-white transition-colors cursor-pointer"
      >
        {isVisibleBoard ? "hide board" : "show board"}
      </button>

      {!isPlay && (
        <button
          onClick={onOpenEditor}
          className="w-full mt-1 px-3 py-2 rounded text-xs font-semibold bg-emerald-600/90 text-white hover:bg-emerald-500 transition-colors cursor-pointer text-center"
        >
          open editor
        </button>
      )}
    </div>
  );
};
