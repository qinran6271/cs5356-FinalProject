// api/index.mjs
import serverless from 'serverless-http';
import app        from '../app.mjs';

export default serverless(app, {
  provider: { callbackWaitsForEmptyEventLoop: false }
});
