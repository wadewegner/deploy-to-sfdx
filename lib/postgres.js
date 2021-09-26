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

exports.getDeploymentCount = () => new Promise((resolve) => {

    const selectQuery = 'SELECT count(guid) FROM deployments WHERE complete = true;';

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        resolve(queryErr);
      }
      resolve(result);
    });
  });

exports.getNewDeployment = () => new Promise((resolve, reject) => {

    const selectQuery = "SELECT TOP 1 guid, username, repo, settings FROM deployments WHERE stage = 'init'";

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        reject(queryErr);
      }
      resolve(result);
    });
  });

exports.insertDeploymentStep = (guid, stage, message) => new Promise((resolve, reject) => {

    const insertQuery = `INSERT INTO deployment_steps (guid, stage, message) VALUES ('${guid}', '${stage}', '${message}')`;

    pool.query(insertQuery, (insertErr) => {
      if (insertErr) {
        console.error('insertDeploymentStep', insertErr);
        reject(insertErr);
      }
      resolve();
    });
  });


exports.insertDeployment = insertQuery => new Promise((resolve) => {

    pool.query(insertQuery, (insertErr) => {
      if (insertErr) {
        console.error('insertDeployment', insertErr);
        resolve(insertErr);
      }
      resolve();
    });
  });

exports.updateDeploymentStatus = (guid, stage) => new Promise((resolve) => {

    const selectQuery = `UPDATE deployments SET stage = '${stage}' WHERE guid = '${guid}'`;

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        console.error('updateDeploymentStatus', queryErr);
        resolve(queryErr);
      }
      resolve(result);
    });
  });

exports.getDeploymentStatus = guid => new Promise((resolve) => {

    const selectQuery = `SELECT deployment_steps.message, deployment_steps.created_at, deployments.complete, deployments.stage, deployments.error_message, deployments.scratch_url FROM deployment_steps INNER JOIN deployments ON deployments.guid = deployment_steps.guid WHERE deployment_steps.guid = '${guid}' ORDER BY created_at;`;

    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        console.error('getDeploymentStatus', queryErr);
        resolve(queryErr);
      }
      resolve(result);
    });
  });

exports.getChoices = () => new Promise((resolve) => {
    const selectQuery = 'SELECT count(*) as depl, repo FROM deployments WHERE complete = true GROUP BY repo ORDER BY depl DESC';
   
    pool.query(selectQuery, (queryErr, result) => {
      if (queryErr) {
        console.error('getChoices', queryErr);
        resolve(queryErr);
      }
      resolve(result);
    });
  });