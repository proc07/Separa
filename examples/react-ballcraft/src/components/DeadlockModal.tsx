import React from "react";

interface DeadlockModalProps {
  show: boolean;
  canAddTube: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onAddTube: () => void;
  onNewGame: () => void;
  onClose: () => void;
}

export function DeadlockModal({
  show,
  canAddTube,
  canUndo,
  onUndo,
  onAddTube,
  onNewGame,
  onClose,
}: DeadlockModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content deadlock-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title deadlock-title">⚠️ 陷入死局</h2>
        <p className="modal-text">当前盘面已无任何可用移动步骤。</p>
        <div className="modal-actions-group">
          {canUndo && (
            <button
              className="btn btn-primary modal-btn"
              onClick={() => {
                onClose();
                onUndo();
              }}
            >
              ⏪ 撤销一步
            </button>
          )}
          {canAddTube && (
            <button
              className="btn btn-accent modal-btn"
              onClick={() => {
                onClose();
                onAddTube();
              }}
            >
              🧪 +1 辅助管
            </button>
          )}
          <button
            className="btn modal-btn"
            onClick={() => {
              onClose();
              onNewGame();
            }}
          >
            🔄 重新开局
          </button>
        </div>
      </div>
    </div>
  );
}
