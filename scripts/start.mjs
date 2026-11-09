process.env.HOST ??= '127.0.0.1';
process.env.PORT ??= '4173';
process.env.ORIGIN ??= `http://${process.env.HOST}:${process.env.PORT}`;
await import('../build/index.js');
