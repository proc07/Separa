import { Service } from "@separa/core";
import { Graph } from "../algorithms/graph";
import {
  PLACE_TYPE,
  type Coords,
  type Food,
  type Snake,
} from "../types";
import { getIndexByPosition, getPositionByIndex, randomId } from "../utils";

@Service({ scope: "singleton" })
export class BoardService {
  w = 40;
  h = 25;
  cellSize = 20;
  borderSize = 1;
  foodCount = 40;

  foods: Food[] = [];
  bricks: Coords[] = [];

  setDimensions(widthPx: number, heightPx: number): boolean {
    const newW = Math.max(10, Math.floor(widthPx / this.cellSize));
    const newH = Math.max(10, Math.floor(heightPx / this.cellSize));
    if (newW !== this.w || newH !== this.h) {
      this.w = newW;
      this.h = newH;
      this.clearBoard();
      return true;
    }
    return false;
  }

  clearBoard(): void {
    this.bricks = [];
    this.foods = [];
  }

  toggleBrick(pos: Coords): void {
    const [x, y] = pos;
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;

    const existingIndex = this.bricks.findIndex(([bx, by]) => bx === x && by === y);
    if (existingIndex >= 0) {
      this.bricks = this.bricks.filter((_, i) => i !== existingIndex);
    } else {
      this.bricks = [...this.bricks, pos];
    }
  }

  clearBricks(): void {
    this.bricks = [];
  }

  consumeFoodAt(pos: Coords): boolean {
    const [x, y] = pos;
    const idx = this.foods.findIndex(([fpos]) => fpos[0] === x && fpos[1] === y);
    if (idx >= 0) {
      this.foods = this.foods.filter((_, i) => i !== idx);
      return true;
    }
    return false;
  }

  spawnFoods(snakes: Snake[]): void {
    const needed = this.foodCount - this.foods.length;
    if (needed <= 0) return;

    const occupied = new Set<number>();
    for (const b of this.bricks) occupied.add(getIndexByPosition(b, this.w));
    for (const [fpos] of this.foods) occupied.add(getIndexByPosition(fpos, this.w));
    for (const s of snakes) {
      if (s.isCrash) continue;
      for (const seg of s.body) occupied.add(getIndexByPosition(seg, this.w));
    }

    const available: Coords[] = [];
    const totalCells = this.w * this.h;
    for (let i = 0; i < totalCells; i++) {
      if (!occupied.has(i)) {
        available.push(getPositionByIndex(i, this.w));
      }
    }

    const newFoods = [...this.foods];
    for (let i = 0; i < needed && available.length > 0; i++) {
      const randIdx = Math.floor(Math.random() * available.length);
      const chosen = available.splice(randIdx, 1)[0]!;
      newFoods.push([chosen, randomId()]);
    }

    this.foods = newFoods;
  }

  buildPopulatedGraph(snakes: Snake[]): Graph {
    const graph = new Graph({ w: this.w, h: this.h, withBounds: false });

    // Bricks
    for (const b of this.bricks) {
      graph.setValueByIndex(getIndexByPosition(b, this.w), { type: PLACE_TYPE.BRICK });
    }

    // Foods
    for (const [foodPos, foodId] of this.foods) {
      graph.setValueByIndex(getIndexByPosition(foodPos, this.w), {
        type: PLACE_TYPE.FOOD,
        foodId,
      });
    }

    // Snakes
    for (const snake of snakes) {
      if (snake.isCrash) continue;
      for (const seg of snake.body) {
        graph.setValueByIndex(getIndexByPosition(seg, this.w), {
          type: PLACE_TYPE.GAME_OBJECT,
          snakeId: snake.id,
        });
      }
    }

    return graph;
  }
}
