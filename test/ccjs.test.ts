import execa from 'execa';
import { promises as fs } from 'fs';
import path from 'path';

import { compile } from '../src';

function randomString(): string {
  return Math.random().toString(32).substring(2);
}

function generateTmpPath(): string {
  return path.join('/', 'tmp', randomString() + '.s');
}

async function execute(src: string): Promise<number> {
  const code = compile(src);

  const [asmPath, objPath] = [generateTmpPath() + '.s', generateTmpPath()];

  await fs.writeFile(asmPath, code);
  await execa('cc', ['-o', objPath, asmPath]);
  const { exitCode } = await execa(objPath).catch((e) => {
    if (e.message.startsWith('Command failed with exit code')) {
      return e;
    }
    throw e;
  });

  await Promise.all([asmPath, objPath].map((path) => fs.unlink(path)));

  return exitCode;
}

describe('compile', () => {
  test('constant', async () => {
    const exitCode = await execute('int main() { return 42; }');
    expect(exitCode).toBe(42);
  });

  test('add sub', async () => {
    const exitCode = await execute('int main() { return 5+20-4; }');
    expect(exitCode).toBe(21);
  });

  test('space', async () => {
    const exitCode = await execute('int main() { return  12 + 34 - 5 ; }');
    expect(exitCode).toBe(41);
  });

  test('add mul', async () => {
    const exitCode = await execute('int main() { return 5+6*7; }');
    expect(exitCode).toBe(47);
  });

  test('parences', async () => {
    const exitCode = await execute('int main() { return 5*(9-6); }');
    expect(exitCode).toBe(15);
  });

  test('parences 2', async () => {
    const exitCode = await execute('int main() { return (3+5)/2; }');
    expect(exitCode).toBe(4);
  });

  test('unary minus', async () => {
    const exitCode = await execute('int main() { return (-10+20); }');
    expect(exitCode).toBe(10);
  });

  test('equals', async () => {
    const exitCode = await execute('int main() { return 1==1; }');
    expect(exitCode).toBe(1);
  });

  test('not equals', async () => {
    const exitCode = await execute('int main() { return 53!=53; }');
    expect(exitCode).toBe(0);
  });

  test('greater', async () => {
    const exitCode = await execute('int main() { return 1>2; }');
    expect(exitCode).toBe(0);
  });

  test('greater equals', async () => {
    const exitCode = await execute('int main() { return 1+1>=2; }');
    expect(exitCode).toBe(1);
  });

  test('less', async () => {
    const exitCode = await execute('int main() { return 3<2; }');
    expect(exitCode).toBe(0);
  });

  test('less equals', async () => {
    const exitCode = await execute('int main() { return 1-1<=2-2; }');
    expect(exitCode).toBe(1);
  });

  test('variable', async () => {
    const exitCode = await execute('int main() {int a;a=1; return a; }');
    expect(exitCode).toBe(1);
  });

  test('variable 2', async () => {
    const exitCode = await execute('int main() {int foo;int bar;foo=1;bar=2+3;foo+bar; }');
    expect(exitCode).toBe(6);
  });

  test('return', async () => {
    const exitCode = await execute('int main() { return 2;return 1; }');
    expect(exitCode).toBe(2);
  });

  test('if', async () => {
    const exitCode = await execute('int main() {if (1 == 1) 2; 1; }');
    expect(exitCode).toBe(1);
  });

  test('if 2', async () => {
    const exitCode = await execute('int main() {if (1) return 2; 1; }');
    expect(exitCode).toBe(2);
  });

  test('else', async () => {
    const exitCode = await execute('int main() {if (1) 2; else 1; }');
    expect(exitCode).toBe(2);
  });

  test('else 2', async () => {
    const exitCode = await execute('int main() {if (0 == 1) 2; else 1; }');
    expect(exitCode).toBe(1);
  });

  test('while', async () => {
    const exitCode = await execute('int main() {int a;a=3;while(a)a=a-1;a; }');
    expect(exitCode).toBe(0);
  });

  test('while 2', async () => {
    const exitCode = await execute('int main() {int a;a=3;while(a)return 2;a; }');
    expect(exitCode).toBe(2);
  });

  test('for', async () => {
    const exitCode = await execute('int main() {int a;int i;a=10;for(i=0;i<3;i=i+1)a=a-1;a; }');
    expect(exitCode).toBe(7);
  });

  test('for 2', async () => {
    const exitCode = await execute('int main() {int a;a=0;for(;a<3;)a=a+1;a; }');
    expect(exitCode).toBe(3);
  });

  test('for 3', async () => {
    const exitCode = await execute(
      'int main() {int i;for (i=0;i<10;i=i+1) { if (i == 5) { return 1; } } return 0; }',
    );
    expect(exitCode).toBe(1);
  });

  test('for 4', async () => {
    const exitCode = await execute(
      'int main() {int a;a=0; for (;;) { a = a+2; if (a > 12) return a; } }',
    );
    expect(exitCode).toBe(14);
  });

  test('function 1', async () => {
    const exitCode = await execute('int foo() { return 42; } int main() { return foo(); }');
    expect(exitCode).toBe(42);
  });

  test('function 2', async () => {
    const exitCode = await execute(
      'int foo() { return 13; } int bar() { return 4; } int main() { return foo() * bar(); }',
    );
    expect(exitCode).toBe(52);
  });

  test('function 3', async () => {
    const exitCode = await execute(
      'int calc(int x,int y,int z) { return x + y * z; } int main() { return calc(12,6,5); }',
    );
    expect(exitCode).toBe(42);
  });

  test('recursive', async () => {
    const exitCode = await execute(
      'int fibo(int x) { if (x < 2) { return x; } return fibo(x - 1) + fibo(x - 2); } int main() { return fibo(10); }',
    );
    expect(exitCode).toBe(55);
  });

  test('address dereference', async () => {
    const exitCode = await execute('int main() { int a;a = 10; return *&a; }');
    expect(exitCode).toBe(10);
  });

  test('address dereference 2', async () => {
    const exitCode = await execute('int main() { int a;int b;a = 1; b = 2; return *(&a - 8); }');
    expect(exitCode).toBe(2);
  });

  test('address dereference 3', async () => {
    const exitCode = await execute('int main() { int x; int *y; y = &x; *y = 3; return x; }');
    expect(exitCode).toBe(3);
  });

  test('local variables', async () => {
    const exitCode = await execute(
      'int foo(int x) { x = 3; return x; } int main() { int x; x = 4; foo(10); return x; }',
    );
    expect(exitCode).toBe(4);
  });
});
