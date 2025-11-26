/**
 * Configuration & Constants
 * @module playground/config
 */

export const CONFIG = {
  version: '2025-10-09-v1-MODULAR',
  api: {
    baseUrl:
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
        ? 'http://localhost:7071/api'
        : 'https://csharpplayground-f6eugbe5dcgehbbc.eastus-01.azurewebsites.net/api',
  },
  monaco: {
    cdnPath: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
    fontSize: 14,
    defaultTheme: {
      light: 'vs',
      dark: 'vs-dark',
    },
  },
  ui: {
    highlightDuration: 2000, // ms
    editorLayoutDelay: 0, // ms
  },
  defaultCode: `Console.WriteLine("Hello, World!");

// Example: Fibonacci sequence
int Fibonacci(int n)
{
    if (n <= 1) return n;
    return Fibonacci(n - 1) + Fibonacci(n - 2);
}

for (int i = 0; i < 10; i++)
{
    Console.WriteLine($"Fibonacci({i}) = {Fibonacci(i)}");
}`,
};

// Diagnostic ID patterns for category filtering
export const DIAGNOSTIC_PATTERNS = {
  compiler: /^(CS|IDE)/,
  design: /^CA1[0-9]{3}$/,
  performance: /^CA18[0-9]{2}$/,
  security: /^CA(5[0-9]{3}|21[0-4][0-9]|2150|2151|2152|2153)$/,
  reliability: /^CA20[0-9]{2}$/,
  maintainability: /^CA15[0-9]{2}$/,
  usage: /^CA(1068|22(01|07|11))$/,
  naming: /^CA17[0-9]{2}$/,
  interoperability: /^CA14[0-9]{2}$/,
  globalization: /^CA(13[0-9]{2}|19[0-9]{2})$/,
};
