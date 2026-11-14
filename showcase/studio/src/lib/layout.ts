/** Responsive unit: 1 = the 1920×1080 design size. */
export type Shape = "landscape" | "portrait" | "square";

export function shapeOf(width: number, height: number): Shape {
  if (height > width * 1.3) return "portrait";
  if (Math.abs(height - width) < 10) return "square";
  return "landscape";
}

export function unit(width: number, height: number): number {
  const s = shapeOf(width, height);
  if (s === "portrait") return (width / 1080) * 0.92;
  if (s === "square") return (width / 1080) * 0.8;
  return width / 1920;
}
