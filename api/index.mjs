// api/index.mjs
import serverless from 'serverless-http';
import app        from '../app_test.mjs';


export default serverless(app, {
  callbackWaitsForEmptyEventLoop: false
});
