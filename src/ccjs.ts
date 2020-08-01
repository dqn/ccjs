export function compile(src: Buffer | string) {
  src = src.toString();

  console.log('.intel_syntax noprefix');
  console.log('.globl main');
  console.log('main:');
  console.log('  mov rax, %d', src);
  console.log('  ret');

  return 0;
}
