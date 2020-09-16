# ccjs

[![build status](https://github.com/dqn/ccjs/workflows/build/badge.svg)](https://github.com/dqn/ccjs/actions)

Toy C Compiler written in Node.js.

ccjs supports x86-64 Linux only.

## Example

```c
// main.c

int fibo(int x)
{
  if (x < 2)
  {
    return x;
  }

  return fibo(x - 1) + fibo(x - 2);
}

int main()
{
  return fibo(10);
}
```

```bash
$ ccjs main.c > main.s
$ cc -o main main.s
$ ./main
$ echo $?
# => 55
```

## License

MIT
