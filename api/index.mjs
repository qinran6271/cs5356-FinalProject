// // api/index.mjs
// import serverless from 'serverless-http';
// import app        from '../app_test.mjs';


// export default serverless(app, {
//   callbackWaitsForEmptyEventLoop: false
// });
// api/index.mjs
export default function handler(req, res) {
    return res.status(200).send('OK');
  }
  