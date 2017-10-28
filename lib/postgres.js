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

    const selectQuery = 'SELECT count(guid) FROM deployments WHERE complete = true;';

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        console.error('getDeploymentCount', queryErr);
        resolve(queryErr);
      }
      console.log('started job', result);
      resolve(result);
    });
  });
};

exports.getNewDeployment = () => {

  return new Promise((resolve, reject) => {

    const selectQuery = "SELECT TOP 1 guid, username, repo, settings FROM deployments WHERE stage = 'init'";

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        reject(queryErr);
      }
      resolve(result);
    });
  });
};

exports.insertDeploymentStep = (guid, stage, message) => {

  return new Promise((resolve, reject) => {

    const insertQuery = `INSERT INTO deployment_steps (guid, stage, message) VALUES ('${guid}', '${stage}', '${message}')`;

    pool.query(insertQuery, (insertErr) => {
      if (insertErr) {
        console.error('insertDeploymentStep', insertErr);
        reject(insertErr);
      }
      resolve();
    });
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

exports.updateDeploymentStatus = (guid, stage) => {

  return new Promise((resolve) => {

    const selectQuery = `UPDATE deployments SET stage = '${stage}' WHERE guid = '${guid}'`;

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        console.error('updateDeploymentStatus', queryErr);
        resolve(queryErr);
      }
      resolve(result);
    });
  });
};

exports.getDeploymentStatus = (guid) => {

  return new Promise((resolve) => {

    const selectQuery = `SELECT deployment_steps.message, deployment_steps.created_at, deployments.complete, deployments.scratch_url FROM deployment_steps INNER JOIN deployments ON deployments.guid = deployment_steps.guid WHERE deployment_steps.guid = '${guid}' ORDER BY created_at;`;

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        console.error('getDeploymentStatus', queryErr);
        resolve(queryErr);
      }
      resolve(result);
    });
  });
};