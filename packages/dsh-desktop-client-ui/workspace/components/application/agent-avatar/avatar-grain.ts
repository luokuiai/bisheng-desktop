let noise: HTMLCanvasElement | null = null;

export function grainTile() {
  if (noise) return noise;
  noise = document.createElement("canvas");
  noise.width = noise.height = 192;
  const ctx = noise.getContext("2d");
  if (!ctx) return noise; // A transparent tile preserves the rest of the avatar when allocation fails.
  const pixels = ctx.createImageData(192, 192);
  let seed = 713;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = seed >>> 24;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  return noise;
}
