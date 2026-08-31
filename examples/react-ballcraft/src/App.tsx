import React from "react";
import { useService, useServiceState } from "@separa/react";
import { BallcraftService } from "@separa/example-ballcraft-shared";
import { Ball } from "./components/Ball";
import { GameOverModal } from "./components/GameOverModal";
import { DeadlockModal } from "./components/DeadlockModal";
import "./App.css";

export default function App() {
  const game = useService(BallcraftService);

  const columns = useServiceState(BallcraftService, (s) => s.columns);
  const pickedBall = useServiceState(BallcraftService, (s) => s.pickedBall);
  const moves = useServiceState(BallcraftService, (s) => s.moves);
  const fromStartMoves = useServiceState(BallcraftService, (s) => s.fromStartMoves);
  const canUndo = useServiceState(BallcraftService, (s) => s.canUndo);
  const canRedo = useServiceState(BallcraftService, (s) => s.canRedo);
  const validTargetIndices = useServiceState(BallcraftService, (s) => s.validTargetIndices);
  const showGameOver = useServiceState(BallcraftService, (s) => s.showGameOver);
  const showDeadlock = useServiceState(BallcraftService, (s) => s.showDeadlock);
  const hint = useServiceState(BallcraftService, (s) => s.hint);
  const hintMessage = useServiceState(BallcraftService, (s) => s.hintMessage);
  const canAddTube = useServiceState(BallcraftService, (s) => s.canAddTube);
  const extraTubesCount = useServiceState(BallcraftService, (s) => s.extraTubesCount);

  return (
    <div className="app">
      <header className="header">
        <div className="title-row">
          <h1 className="title">Ballcraft</h1>
          <span className="badge">Separa · React</span>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={() => game.newGame()}>
            新游戏
          </button>
          <div className="btn-group">
            <button className="btn btn-feature" onClick={() => game.requestHint()}>
              💡 提示
            </button>
            <button
              className="btn btn-feature"
              disabled={!canAddTube}
              title={canAddTube ? "添加空辅助管（最多2根）" : "辅助管已达上限"}
              onClick={() => game.addExtraTube()}
            >
              🧪 +1 空管 {extraTubesCount > 0 ? `(${extraTubesCount}/2)` : ""}
            </button>
          </div>
          <div className="btn-group">
            <button className="btn" disabled={!canUndo} onClick={() => game.undo()}>
              撤销
            </button>
            <button className="btn" disabled={!canRedo} onClick={() => game.redo()}>
              重做
            </button>
          </div>
        </div>

        {/* 提示消息横幅 */}
        {hintMessage && (
          <div className="hint-banner" onClick={() => game.clearHint()}>
            <span className="hint-text">{hintMessage}</span>
            <button className="hint-close-btn" aria-label="关闭提示">
              ✕
            </button>
          </div>
        )}

        <div className="stats">
          <span>总步数: <strong>{moves}</strong></span>
          <span>有效步数: <strong>{fromStartMoves}</strong></span>
        </div>
      </header>

      <main
        className="game-field"
        style={{
          gridTemplateColumns: `repeat(${Math.ceil(columns.length / 2)}, calc(var(--ball-size) + 12px))`,
        }}
      >
        {columns.map((column, cid) => {
          const isPickedFrom = pickedBall?.from === cid;
          const isValidTarget = validTargetIndices.includes(cid);
          const isHintFrom = hint?.from === cid;
          const isHintTo = hint?.to === cid;

          return (
            <div
              key={cid}
              className="column-slot"
              onClick={() => game.selectColumn(cid)}
            >
              {/* 悬浮球区域 */}
              <div className="hover-slot">
                {isPickedFrom && <Ball color={pickedBall.color} isFloating />}
              </div>

              {/* 球管主体 */}
              <div
                className={`tube ${isValidTarget ? "valid" : ""} ${
                  isPickedFrom ? "picked-from" : ""
                } ${isHintFrom ? "hint-from" : ""} ${isHintTo ? "hint-to" : ""}`}
              >
                {isHintFrom && <span className="tube-hint-tag hint-tag-from">移出</span>}
                {isHintTo && <span className="tube-hint-tag hint-tag-to">移入</span>}
                {column.map((color, bid) => (
                  <Ball key={bid} color={color} />
                ))}
              </div>
            </div>
          );
        })}
      </main>

      <GameOverModal
        show={showGameOver}
        moves={moves}
        onNewGame={() => game.newGame()}
        onClose={() => game.closeGameOver()}
      />

      <DeadlockModal
        show={showDeadlock}
        canAddTube={canAddTube}
        canUndo={canUndo}
        onUndo={() => game.undo()}
        onAddTube={() => game.addExtraTube()}
        onNewGame={() => game.newGame()}
        onClose={() => game.closeDeadlockModal()}
      />

      <footer className="footer">
        <p>基于 Separa 依赖注入与响应式框架驱动</p>
      </footer>
    </div>
  );
}
