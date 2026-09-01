<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useService } from "@separa/vue";
import { SnakeGameService } from "@separa/example-snake-shared";
import GameBoard from "./components/GameBoard.vue";
import SideBar from "./components/SideBar.vue";
import Editor from "./components/Editor.vue";

const game = useService(SnakeGameService);

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement).tagName.toLowerCase() === "textarea") return;
  game.handleKeyDown(e.key);
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden font-sans">
    <GameBoard
      :w="game.w.value"
      :h="game.h.value"
      :cell-size="game.cellSize.value"
      :border-size="game.borderSize.value"
      :snakes="game.snakes.value"
      :foods="game.foods.value"
      :bricks="game.bricks.value"
      :indexes-visible="game.indexesVisible.value"
      @toggle-brick="(pos) => game.toggleBrick(pos)"
      @set-dimensions="(wPx, hPx) => game.setDimensions(wPx, hPx)"
    />

    <SideBar
      :snakes="game.snakes.value"
      :game-state="game.gameState.value"
      :is-enabled-collision-detect="game.isEnabledCollisionDetect.value"
      :is-user-in-game="game.isUserInGame.value"
      :indexes-visible="game.indexesVisible.value"
      :need-fill-empty-graphs-cells="game.needFillEmptyGraphsCells.value"
      :is-logger-enabled="game.isLoggerEnabled.value"
      :custom-code-is-enabled="game.customCodeIsEnabled.value"
      :fps="game.fps.value"
      :is-visible-board="game.isVisibleBoard.value"
      @toggle-play-pause="() => game.togglePlayPause()"
      @restart="() => game.restart()"
      @add-snake="() => game.addSnake()"
      @remove-snake="(id) => game.removeSnake(id)"
      @update-snake-settings="(id, s) => game.updateSettingForSnake(id, s)"
      @toggle-board-visible="() => game.toggleBoardVisible()"
      @toggle-collision="() => game.setCollisionState()"
      @toggle-user-in-game="() =>
        game.isUserInGame.value ? game.removeUserFromGame() : game.addUserToGame()
      "
      @toggle-indexes-visible="() => game.setIndexesVisible()"
      @toggle-fill-empty-cells="() => game.fillEmptyGraphCells()"
      @toggle-logger="() => game.setLoggerState()"
      @toggle-custom-code="() => game.toggleCustomCode()"
      @change-fps="(fps) => game.changeFps(fps)"
      @open-editor="() => game.toggleEditor(true)"
    />

    <Editor
      v-if="game.isEditorOpen.value"
      :code="game.editorCode.value"
      :theme="game.editorTheme.value"
      @change-code="(code) => game.changeEditorCode(code)"
      @change-theme="(theme) => game.changeTheme(theme)"
      @close="() => game.toggleEditor(false)"
    />
  </div>
</template>
