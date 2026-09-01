import appleUrl from "../assets/apple.png";
import brickUrl from "../assets/brick.png";

export const assets = {
  apple: new Image(),
  brick: new Image(),
  loaded: false,
};

function loadImage(img: HTMLImageElement, src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    img.onload = () => resolve(img);
    img.src = src;
  });
}

export async function loadAssets(): Promise<void> {
  if (assets.loaded) return;
  await Promise.all([
    loadImage(assets.apple, appleUrl),
    loadImage(assets.brick, brickUrl),
  ]);
  assets.loaded = true;
}
