// server.js
import app from './app.mjs';

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 local： http://localhost:${port}`);
});