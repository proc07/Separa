import React, { useState, useRef } from "react";
import type { Snake, SnakeSettings } from "@separa/example-snake-shared";
import { GAME_STATE } from "@separa/example-snake-shared";
import { ScoreBoard } from "./ScoreBoard";
import { CommonSettings } from "./CommonSettings";
import { SnakeSettingsItem } from "./SnakeSettingsItem";
import { ControlPanel } from "./ControlPanel";

interface SideBarProps {
  snakes: Snake[];
  gameState: GAME_STATE;
  isEnabledCollisionDetect: boolean;
  isUserInGame: boolean;
  indexesVisible: boolean;
  needFillEmptyGraphsCells: boolean;
  isLoggerEnabled: boolean;
  customCodeIsEnabled: boolean;
  fps: number;
  isVisibleBoard: boolean;
  onTogglePlayPause: () => void;
  onRestart: () => void;
  onAddSnake: () => void;
  onRemoveSnake: (snakeId: string) => void;
  onUpdateSnakeSettings: (snakeId: string, settings: Partial<SnakeSettings>) => void;
  onToggleBoardVisible: () => void;
  onToggleCollision: () => void;
  onToggleUserInGame: () => void;
  onToggleIndexesVisible: () => void;
  onToggleFillEmptyCells: () => void;
  onToggleLogger: () => void;
  onToggleCustomCode: () => void;
  onChangeFps: (fps: number) => void;
  onOpenEditor: () => void;
}

export const SideBar: React.FC<SideBarProps> = ({
  snakes,
  gameState,
  isEnabledCollisionDetect,
  isUserInGame,
  indexesVisible,
  needFillEmptyGraphsCells,
  isLoggerEnabled,
  customCodeIsEnabled,
  fps,
  isVisibleBoard,
  onTogglePlayPause,
  onRestart,
  onAddSnake,
  onRemoveSnake,
  onUpdateSnakeSettings,
  onToggleBoardVisible,
  onToggleCollision,
  onToggleUserInGame,
  onToggleIndexesVisible,
  onToggleFillEmptyCells,
  onToggleLogger,
  onToggleCustomCode,
  onChangeFps,
  onOpenEditor,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const isDragging = useRef(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow drag if clicking the header / drag handle
    const target = e.target as HTMLElement;
    if (["input", "select", "button", "textarea"].includes(target.tagName.toLowerCase())) {
      return;
    }
    isDragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - dragStart.current.mouseX;
      const dy = ev.clientY - dragStart.current.mouseY;
      // Position from top-right
      setPosition({
        x: Math.max(10, dragStart.current.startX - dx),
        y: Math.max(10, dragStart.current.startY + dy),
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: `${position.y}px`,
        right: `${position.x}px`,
        width: "320px",
        zIndex: 50,
      }}
      className="select-none"
    >
      <div
        onMouseDown={handleMouseDown}
        className="cursor-move"
      >
        {isVisibleBoard && (
          <div className="p-4 rounded-xl bg-black/75 hover:bg-black/95 backdrop-blur-md text-white border border-neutral-800/80 shadow-2xl transition-all duration-300 max-h-[75vh] overflow-y-auto">
            <ScoreBoard snakes={snakes} />

            <CommonSettings
              isEnabledCollisionDetect={isEnabledCollisionDetect}
              isUserInGame={isUserInGame}
              indexesVisible={indexesVisible}
              needFillEmptyGraphsCells={needFillEmptyGraphsCells}
              isLoggerEnabled={isLoggerEnabled}
              customCodeIsEnabled={customCodeIsEnabled}
              fps={fps}
              onToggleCollision={onToggleCollision}
              onToggleUserInGame={onToggleUserInGame}
              onToggleIndexesVisible={onToggleIndexesVisible}
              onToggleFillEmptyCells={onToggleFillEmptyCells}
              onToggleLogger={onToggleLogger}
              onToggleCustomCode={onToggleCustomCode}
              onChangeFps={onChangeFps}
            />

            {snakes
              .filter((s) => s.id !== "user")
              .map((snake) => (
                <SnakeSettingsItem
                  key={snake.id}
                  snake={snake}
                  onUpdateSettings={onUpdateSnakeSettings}
                  onRemoveSnake={onRemoveSnake}
                />
              ))}
          </div>
        )}

        <ControlPanel
          gameState={gameState}
          isVisibleBoard={isVisibleBoard}
          onTogglePlayPause={onTogglePlayPause}
          onRestart={onRestart}
          onAddSnake={onAddSnake}
          onToggleBoardVisible={onToggleBoardVisible}
          onOpenEditor={onOpenEditor}
        />
      </div>
    </div>
  );
};
