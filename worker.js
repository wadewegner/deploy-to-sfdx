const amqpOpen = require('amqplib').connect(process.env.CLOUDAMQP_URL);
const postgresHelper = require('./lib/postgres.js');
const steps = require('./lib/steps.js');
const async = require('async');

// check for anything at init
async.whilst(
  () => {
    return true;
  },
  (callback) => {

    postgresHelper.getNewDeployment().then((newDeploymentResult) => {

      for (let i = 0; i < newDeploymentResult.rowCount; i++) {

        const row = newDeploymentResult.rows[i];
        const guid = row.guid;
        const settings = JSON.parse(row.settings);
        const assignPermset = settings.assignPermset;
        const permsetName = settings.permsetName;
        const deleteScratchOrg = settings.deleteScratchOrg;
        const runApexTests = settings.runApexTests;
        const scratchOrgDef = settings.scratchOrgDef;
        const showScratchOrgUrl = settings.showScratchOrgUrl;
        const githubRepo = settings.githubRepo;
        const access_token = settings.access_token;
        const instance_url = settings.instance_url;
        const user_name = settings.user_name;
        const tokenName = access_token.replace(/\W/g, '');
        const startingDirectory = process.env.STARTINGDIRECTORY;
        const directory = `${tokenName}-${guid}`;

        const initScript = `${startingDirectory}mkdir ${directory};cd ${directory};git clone ${githubRepo} .`;
        const createScript = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url};sfdx force:org:create -v '${access_token}' -s -f ${scratchOrgDef}`;
        
        console.log('createScript', createScript);


        //
        steps.clone(guid, initScript, githubRepo)
          .then((result) => {
            console.log('result1', result);
          })
          .then(steps.create(guid, createScript))
          .then((result) => {
            console.log('result2', result);
          })
          .then(steps.create2())
          .then((result) => {
            console.log('result3', result);
          });

      }
    });





    //         // update stage to 'create'
    //         stage = 'create';

    //         script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url}`;
    //         commands.run('create', script, () => {
    //           script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:org:create -v '${access_token}' -s -f ${scratchOrgDef}`;
    //           commands.run('create', script, (commandResult, commandErr) => {
    //             if (commandErr) {
    //               message = `Error: ${commandErr}.`;
    //             } else {
    //               message = `${commandResult}.`;
    //             }

    //           });
    //         });

    //         console.log('this');
    //       }).then(() => {
    //         console.log('this');

    //       });
    //     });
    //   }
    // });

    setTimeout(() => {
      callback(null, true);
    }, 1000);
  },
  (err) => {
    console.log(`err: ${err}`);
  }
);




// script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:config:set instanceUrl=${instance_url}`;
// commands.run('create', script, () => {
//   script = `${startingDirectory}cd ${directory};export FORCE_SHOW_SPINNER=;sfdx force:org:create -v '${access_token}' -s -f ${scratchOrgDef}`;
//   commands.run('create', script, (commandResult, commandErr) => {
//     if (commandErr) {
//       message = `Error: ${commandErr}.`;
//     } else {
//       message = `${commandResult}.`;
//     }

//   });
// });

//     // message = 'hello people!';
//     // ch.sendToQueue(guid, Buffer.from(message), {
//     //   persistent: true
//     // });

//     // message = 'done';
//     // ch.sendToQueue(guid, Buffer.from(message), {
//     //   persistent: true
//     // });
//   });

// ch.ack(msg);
// }
// });
// });
// })
// .catch(console.warn);