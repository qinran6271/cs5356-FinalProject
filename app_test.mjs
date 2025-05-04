// app_test.mjs
import express from 'express';

const app = express();

// 最简单的根路由
app.get('/', (req, res) => {
  res.send('Hello World');
});

export default app;