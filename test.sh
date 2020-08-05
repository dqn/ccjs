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

assert 0 '0;'
assert 42 '42;'
assert 21 '5+20-4;'
assert 41 ' 12 + 34 - 5 ;'
assert 47 '5+6*7;'
assert 15 '5*(9-6);'
assert 4 '(3+5)/2;'
assert 10 '(-10+20);'
assert 1 '1==1;'
assert 0 '53!=53;'
assert 0 '1>2;'
assert 1 '1+1>=2;'
assert 0 '3<2;'
assert 1 '1-1<=2-2;'
assert 1 'a=1;a;'
assert 111 'b=123;b=b-12;'
assert 20 'c=30;b=10;c-b;'

echo OK

rm tmp tmp.s
