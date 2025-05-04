// // api/index.mjs
// import serverless from 'serverless-http';
// import app        from '../app_test.mjs';


// export default serverless(app, {
//   callbackWaitsForEmptyEventLoop: false
// });
// api/index.mjs
// api/index.mjs
import serverless from 'serverless-http';
import express    from 'express';

const app = express();
app.get('/', (req, res) => res.send('Hello Express'));

export default serverless(app, {
  callbackWaitsForEmptyEventLoop: false
});

  