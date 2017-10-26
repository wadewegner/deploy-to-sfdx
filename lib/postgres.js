const Pool = require('pg-pool');
const dbUrl = require('url');

const dbParams = dbUrl.parse(process.env.DATABASE_URL);
const auth = dbParams.auth.split(':');

const config = {
  host: dbParams.hostname,
  port: dbParams.port,
  user: auth[0],
  ssl: true,
  password: auth[1],
  database: dbParams.pathname.split('/')[1],
  idleTimeoutMillis: 1000,
  max: 10
};

const pool = new Pool(config);

exports.getDeploymentCount = () => {

  return new Promise((resolve) => {

    // const selectQuery = 'SELECT count(id) FROM deployments;';

    // pool.query(selectQuery, (queryErr, result) => {
    //   if (queryErr) {
    //     console.error('getDeploymentCount', queryErr);
    //     resolve(queryErr);
    //   }
    //   resolve(result);
    // });

    resolve(400);
  });
};

exports.insertDeployment = (insertQuery) => {

  return new Promise((resolve) => {

    // pool.query(insertQuery, (insertErr) => {
    //   if (insertErr) {
    //     console.error('insertDeployment', insertErr);
    //     resolve(insertErr);
    //   }
    //   resolve();
    // });
    resolve();
  });
};