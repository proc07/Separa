import React from "react";
import { EDITOR_THEMES } from "@separa/example-snake-shared";

interface EditorProps {
  code: string;
  theme: string;
  onChangeCode: (code: string) => void;
  onChangeTheme: (theme: string) => void;
  onClose: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  theme,
  onChangeCode,
  onChangeTheme,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-[#1e1e1e] text-white z-50 flex flex-col font-mono">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="font-bold text-emerald-400 text-sm">🐍 Snake Algorithm Editor</span>
          <span className="text-xs text-neutral-400">
            Write your custom AI search algorithm in JavaScript
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-neutral-300 flex items-center gap-1.5">
            <span>Theme:</span>
            <select
              value={theme}
              onChange={(e) => onChangeTheme(e.target.value)}
              className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {EDITOR_THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-semibold transition-colors cursor-pointer"
          >
            Back to Game 🎮
          </button>
        </div>
      </div>

      {/* Code Editor TextArea */}
      <div className="flex-1 p-4 bg-[#141414] overflow-hidden flex flex-col">
        <textarea
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-4 bg-transparent text-emerald-300 font-mono text-sm leading-relaxed focus:outline-none resize-none selection:bg-emerald-900/60 selection:text-white"
        />
      </div>
    </div>
  );
};
