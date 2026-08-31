<script setup lang="ts">
import { useService } from "@separa/vue";
import { BallcraftService } from "@separa/example-ballcraft-shared";
import Ball from "./components/Ball.vue";
import GameOverModal from "./components/GameOverModal.vue";
import DeadlockModal from "./components/DeadlockModal.vue";
import "./App.css";

/**
 * 解构 useService 获取顶层 Ref 与方法，
 * 模板中自动解包，完全无需写 .value。
 */
const {
  columns,
  pickedBall,
  moves,
  fromStartMoves,
  canUndo,
  canRedo,
  validTargetIndices,
  showGameOver,
  showDeadlock,
  hint,
  hintMessage,
  canAddTube,
  extraTubesCount,
  newGame,
  undo,
  redo,
  selectColumn,
  requestHint,
  clearHint,
  addExtraTube,
  closeGameOver,
  closeDeadlockModal,
} = useService(BallcraftService);
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="title-row">
        <h1 class="title">Ballcraft</h1>
        <span class="badge">Separa · Vue</span>
      </div>

      <div class="actions">
        <button class="btn btn-primary" @click="newGame()">新游戏</button>
        <div class="btn-group">
          <button class="btn btn-feature" @click="requestHint()">
            💡 提示
          </button>
          <button
            class="btn btn-feature"
            :disabled="!canAddTube"
            :title="canAddTube ? '添加空辅助管（最多2根）' : '辅助管已达上限'"
            @click="addExtraTube()"
          >
            🧪 +1 空管 {{ extraTubesCount > 0 ? `(${extraTubesCount}/2)` : '' }}
          </button>
        </div>
        <div class="btn-group">
          <button class="btn" :disabled="!canUndo" @click="undo()">撤销</button>
          <button class="btn" :disabled="!canRedo" @click="redo()">重做</button>
        </div>
      </div>

      <!-- 提示消息横幅 -->
      <div v-if="hintMessage" class="hint-banner" @click="clearHint()">
        <span class="hint-text">{{ hintMessage }}</span>
        <button class="hint-close-btn" aria-label="关闭提示">✕</button>
      </div>

      <div class="stats">
        <span>总步数: <strong>{{ moves }}</strong></span>
        <span>有效步数: <strong>{{ fromStartMoves }}</strong></span>
      </div>
    </header>

    <main class="game-field" :style="{ gridTemplateColumns: `repeat(${Math.ceil(columns.length / 2)}, calc(var(--ball-size) + 12px))` }">
      <div
        v-for="(column, cid) in columns"
        :key="cid"
        class="column-slot"
        @click="selectColumn(cid)"
      >
        <!-- 悬浮球区域 -->
        <div class="hover-slot">
          <Ball
            v-if="pickedBall?.from === cid"
            :color="pickedBall.color"
            is-floating
          />
        </div>

        <!-- 球管主体 -->
        <div
          class="tube"
          :class="{
            valid: validTargetIndices.includes(cid),
            'picked-from': pickedBall?.from === cid,
            'hint-from': hint?.from === cid,
            'hint-to': hint?.to === cid,
          }"
        >
          <span v-if="hint?.from === cid" class="tube-hint-tag hint-tag-from">移出</span>
          <span v-if="hint?.to === cid" class="tube-hint-tag hint-tag-to">移入</span>
          <Ball
            v-for="(color, bid) in column"
            :key="bid"
            :color="color"
          />
        </div>
      </div>
    </main>

    <GameOverModal
      :show="showGameOver"
      :moves="moves"
      @new-game="newGame()"
      @close="closeGameOver()"
    />

    <DeadlockModal
      :show="showDeadlock"
      :can-add-tube="canAddTube"
      :can-undo="canUndo"
      @undo="undo()"
      @add-tube="addExtraTube()"
      @new-game="newGame()"
      @close="closeDeadlockModal()"
    />

    <footer class="footer">
      <p>基于 Separa 依赖注入与响应式框架驱动</p>
    </footer>
  </div>
</template>
