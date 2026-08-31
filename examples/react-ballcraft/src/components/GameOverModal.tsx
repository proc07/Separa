import React from "react";

interface GameOverModalProps {
  show: boolean;
  moves: number;
  onNewGame: () => void;
  onClose: () => void;
}

export function GameOverModal({ show, moves, onNewGame, onClose }: GameOverModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">🎉 恭喜通关！</h2>
        <p className="modal-text">
          你的成绩是 <strong>{moves}</strong> 步！
        </p>
        <button
          className="btn btn-primary modal-btn"
          onClick={() => {
            onClose();
            onNewGame();
          }}
        >
          再玩一局
        </button>
      </div>
    </div>
  );
}
