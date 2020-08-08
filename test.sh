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

assert 0 'main() {0;}'
assert 42 'main() {42;}'
assert 21 'main() {5+20-4;}'
assert 41 'main() { 12 + 34 - 5 ;}'
assert 47 'main() {5+6*7;}'
assert 15 'main() {5*(9-6);}'
assert 4 'main() {(3+5)/2;}'
assert 10 'main() {(-10+20);}'
assert 1 'main() {1==1;}'
assert 0 'main() {53!=53;}'
assert 0 'main() {1>2;}'
assert 1 'main() {1+1>=2;}'
assert 0 'main() {3<2;}'
assert 1 'main() {1-1<=2-2;}'
assert 1 'main() {a=1;a;}'
assert 111 'main() {b=123;b=b-12;}'
assert 20 'main() {c=30;b=10;c-b;}'
assert 6 'main() {foo=1;bar=2+3;foo+bar;}'
assert 10 'main() {return 10;}'
assert 7 'main() {aa=4;bb=3;return aa+bb;}'
assert 2 'main() {return 2;return 1;}'
assert 1 'main() {if (1 == 1) 2; 1;}'
assert 2 'main() {if (1) return 2; 1;}'
assert 2 'main() {if (1) 2; else 1;}'
assert 1 'main() {if (0 == 1) 2; else 1;}'
assert 0 'main() {a=3;while(a)a=a-1;a;}'
assert 2 'main() {a=3;while(a)return 2;a;}'
assert 7 'main() {a=10;for(i=0;i<3;i=i+1)a=a-1;a;}'
assert 3 'main() {a=0;for(;a<3;)a=a+1;a;}'
assert 1 'main() {for (i=0;i<10;i=i+1) { if (i == 5) { return 1; } } return 0;}'
assert 14 'main() {a=0; for (;;) { a = a+2; if (a > 12) return a; } }'
assert 1 'main() {return 1;}'
assert 1 'foo() { return 1;} main() {return 1;}'
assert 42 'foo() { return 42;} main() {return foo();}'
assert 52 'foo() { return 13;} bar() { return 4;} main() {return foo() * bar();}'
assert 42 'calc(x,y,z) { return x + y * z;} main() {return calc(12,6,5);}'

echo OK

rm tmp tmp.s
