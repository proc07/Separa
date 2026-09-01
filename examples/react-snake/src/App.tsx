import React, { useEffect } from "react";
import { useService } from "@separa/react";
import { SnakeGameService } from "@separa/example-snake-shared";
import { GameBoard } from "./components/GameBoard";
import { SideBar } from "./components/SideBar";
import { Editor } from "./components/Editor";

export const App: React.FC = () => {
  const game = useService(SnakeGameService);

  // Global Keyboard Controls (WASD / Arrows / Space / R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing when in editor textarea
      if ((e.target as HTMLElement).tagName.toLowerCase() === "textarea") return;
      game.handleKeyDown(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game]);

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans">
      <GameBoard
        w={game.w}
        h={game.h}
        cellSize={game.cellSize}
        borderSize={game.borderSize}
        snakes={game.snakes}
        foods={game.foods}
        bricks={game.bricks}
        indexesVisible={game.indexesVisible}
        onToggleBrick={(pos) => game.toggleBrick(pos)}
        onSetDimensions={(wPx, hPx) => game.setDimensions(wPx, hPx)}
      />

      <SideBar
        snakes={game.snakes}
        gameState={game.gameState}
        isEnabledCollisionDetect={game.isEnabledCollisionDetect}
        isUserInGame={game.isUserInGame}
        indexesVisible={game.indexesVisible}
        needFillEmptyGraphsCells={game.needFillEmptyGraphsCells}
        isLoggerEnabled={game.isLoggerEnabled}
        customCodeIsEnabled={game.customCodeIsEnabled}
        fps={game.fps}
        isVisibleBoard={game.isVisibleBoard}
        onTogglePlayPause={() => game.togglePlayPause()}
        onRestart={() => game.restart()}
        onAddSnake={() => game.addSnake()}
        onRemoveSnake={(id) => game.removeSnake(id)}
        onUpdateSnakeSettings={(id, s) => game.updateSettingForSnake(id, s)}
        onToggleBoardVisible={() => game.toggleBoardVisible()}
        onToggleCollision={() => game.setCollisionState()}
        onToggleUserInGame={() =>
          game.isUserInGame ? game.removeUserFromGame() : game.addUserToGame()
        }
        onToggleIndexesVisible={() => game.setIndexesVisible()}
        onToggleFillEmptyCells={() => game.fillEmptyGraphCells()}
        onToggleLogger={() => game.setLoggerState()}
        onToggleCustomCode={() => game.toggleCustomCode()}
        onChangeFps={(fps) => game.changeFps(fps)}
        onOpenEditor={() => game.toggleEditor(true)}
      />

      {game.isEditorOpen && (
        <Editor
          code={game.editorCode}
          theme={game.editorTheme}
          onChangeCode={(code) => game.changeEditorCode(code)}
          onChangeTheme={(theme) => game.changeTheme(theme)}
          onClose={() => game.toggleEditor(false)}
        />
      )}
    </div>
  );
};

export default App;
