#!/bin/bash

assert() {
  expected="$1"
  input="$2"

  node dist/bin/ccjs.js -c "$input" > tmp.s
  cc -o tmp tmp.s
  ./tmp
  actual="$?"

  if [ "$actual" = "$expected" ]; then
    echo "$input => $actual"
  else
    echo "$input => $expected expected, but got $actual"
    exit 1
  fi
}

assert 0 'int main() {0;}'
assert 42 'int main() {42;}'
assert 21 'int main() {5+20-4;}'
assert 41 'int main() { 12 + 34 - 5 ;}'
assert 47 'int main() {5+6*7;}'
assert 15 'int main() {5*(9-6);}'
assert 4 'int main() {(3+5)/2;}'
assert 10 'int main() {(-10+20);}'
assert 1 'int main() {1==1;}'
assert 0 'int main() {53!=53;}'
assert 0 'int main() {1>2;}'
assert 1 'int main() {1+1>=2;}'
assert 0 'int main() {3<2;}'
assert 1 'int main() {1-1<=2-2;}'
assert 1 'int main() {int a;a=1;a;}'
assert 111 'int main() {int b;b=123;b=b-12;}'
assert 20 'int main() {int b;int c;c=30;b=10;c-b;}'
assert 6 'int main() {int foo;int bar;foo=1;bar=2+3;foo+bar;}'
assert 10 'int main() {return 10;}'
assert 7 'int main() {int aa;int bb;aa=4;bb=3;return aa+bb;}'
assert 2 'int main() {return 2;return 1;}'
assert 1 'int main() {if (1 == 1) 2; 1;}'
assert 2 'int main() {if (1) return 2; 1;}'
assert 2 'int main() {if (1) 2; else 1;}'
assert 1 'int main() {if (0 == 1) 2; else 1;}'
assert 0 'int main() {int a;a=3;while(a)a=a-1;a;}'
assert 2 'int main() {int a;a=3;while(a)return 2;a;}'
assert 7 'int main() {int a;int i;a=10;for(i=0;i<3;i=i+1)a=a-1;a;}'
assert 3 'int main() {int a;a=0;for(;a<3;)a=a+1;a;}'
assert 1 'int main() {int i;for (i=0;i<10;i=i+1) { if (i == 5) { return 1; } } return 0;}'
assert 14 'int main() {int a;a=0; for (;;) { a = a+2; if (a > 12) return a; } }'
assert 1 'int main() {return 1;}'
assert 1 'int foo() { return 1;} int main() {return 1;}'
assert 42 'int foo() { return 42;} int main() {return foo();}'
assert 52 'int foo() { return 13;} bar() { return 4;} int main() {return foo() * bar();}'
assert 42 'int calc(int x,int y,int z) { return x + y * z;} int main() {return calc(12,6,5);}'
assert 55 'int fibo(int x) { if (x < 2) { return x; } return fibo(x - 1) + fibo(x - 2); } int main() { return fibo(10); }'
assert 10 'int main() { int a;a = 10; return *&a; }'
assert 2 'int main() { int a;int b;a = 1; b = 2; return *(&a - 8); }'

echo OK

rm tmp tmp.s
