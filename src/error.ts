let src = '';

export function errorAt(pos: number, fmt: string, ...args: unknown[]): never {
  console.error(src);
  console.error(`${' '.repeat(pos)}^ ${fmt}`, ...args);
  process.exit(1);
}

export function setSrc(s: string) {
  src = s;
}
