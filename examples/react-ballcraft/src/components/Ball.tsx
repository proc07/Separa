import React from "react";
import { PALETTE, type ColorId } from "@separa/example-ballcraft-shared";

interface BallProps {
  color: ColorId;
  isFloating?: boolean;
}

export function Ball({ color, isFloating = false }: BallProps) {
  const bg = PALETTE[color] || "#ccc";
  return (
    <div
      className={`ball ${isFloating ? "floating" : ""}`}
      style={{ backgroundColor: bg }}
    />
  );
}
