/** Mean linear luminance, sampled once per image rather than on animation frames. */
export function imageLuminance(pixels: Uint8ClampedArray): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    sum += .2126 * linear(pixels[i]) + .7152 * linear(pixels[i + 1]) + .0722 * linear(pixels[i + 2]);
  }
  return pixels.length ? sum / (pixels.length / 4) : .5;
}

export function backgroundScrimOpacity(luminance: number, brightness: number, preferred: number): number {
  const light = luminance * brightness / 100;
  if (light <= .18) return Math.min(.12, preferred / 100);
  return Math.min(.55, Math.max(preferred / 100, .18 + (light - .18) * .46));
}
