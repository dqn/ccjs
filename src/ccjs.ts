function strtol(str: string): [number, string] {
  const n = parseInt(str);

  if (isNaN(n)) {
    return [0, str];
  }

  return [n, str.replace(n.toString(), '')];
}

export function compile(src: Buffer | string) {
  src = src.toString();

  console.log('.intel_syntax noprefix');
  console.log('.globl main');
  console.log('main:');

  let n = 0;
  [n, src] = strtol(src);
  console.log('  mov rax, %d', n);

  while (src) {
    switch (src[0]) {
      case '+': {
        [n, src] = strtol(src.slice(1));
        console.log('  add rax, %d', n);
        continue;
      }
      case '-': {
        [n, src] = strtol(src.slice(1));
        console.log('  sub rax, %d', n);
        continue;
      }
      default: {
        console.error('unexpected character: %d', src[0]);
        return;
      }
    }
  }

  console.log('  ret');
}
