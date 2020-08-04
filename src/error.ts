let src = '';

export function errorAt(pos: number, fmt: string, ...args: unknown[]) {
  console.error(src);
  console.error(`${' '.repeat(pos)}^ ${fmt}`, ...args);
}

export function setSrc(s: string) {
  src = s;
}
