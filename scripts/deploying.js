/* globals $,document, jsyaml */

$(document).ready(() => {

  let actionCount = 0;
  let message = '';

  function update_status(newMessage, excludeCount) {
    actionCount += 1;

    if (excludeCount) {
      message = `${newMessage}\n${message}`;
    } else {
      newMessage = newMessage.replace(/^\s+|\s+$/g, '');
      message = `${actionCount}) ${newMessage}\n${message}`;
    }

    $('textarea#status').val(message);
  }

  function deployingApi(command, timestamp, param) {

    const commandData = {
      command,
      timestamp,
      param
    };

    return $.ajax({
      type: 'POST',
      url: '/api/deploying',
      data: JSON.stringify(commandData),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      timeout: 120000,
      success: (commandDataResponse) => {
        update_status(`${commandDataResponse.message}`);
      },
      error: (commandDataResponse) => {
        update_status(`Sorry, something went wrong. Please contact @WadeWegner on Twitter and send the following error message.\n\nError: ${commandDataResponse.responseText}\n`, true);
        $('div#loaderBlock').hide();
      }
    });
  }

  function runArray(theArray, timestamp, command){
    if (theArray){
      let requests = [];
      for (let item of theArray){
        requests.push(deployingApi(command, timestamp, item));
      }
      return Promise.all(requests);
    } else {
      return null;
    }
  }

  function deploy(yamlSettings, githubRepo) {

    const timestamp = new Date().getTime().toString();

    return deployingApi('clone', timestamp, githubRepo)
      .then(() => deployingApi('create', timestamp, yamlSettings.scratchOrgDef))
      // anything that needs to be installed before the source (dependencies!)
      .then(() => {
        return runArray(yamlSettings.packagesPre, timestamp, 'package');
      })
      .then(() => deployingApi('push', timestamp))
      // anything that can be installed after the source goes in (things that depend on the source!)
      .then(() => {
        return runArray(yamlSettings.packagesPost, timestamp, 'package');
      })
      .then(() => {
        if (yamlSettings.permsetName) {
          return deployingApi('permset', timestamp, yamlSettings.permsetName);
        } else {
          return null;
        }
      })
      // end of metadata setup portion
      // start of data/scripting
      // loading data
      .then(() => {
        return runArray(yamlSettings.executeApex, timestamp, 'apex');
      })
      .then(() => {
        return runArray(yamlSettings.dataImport, timestamp, 'data');
      })
      // executing apex post import
      .then(() => {
        return runArray(yamlSettings.executeApexPost, timestamp, 'apex');
      })
      // testing
      .then(() => deployingApi('test', timestamp, yamlSettings.runApexTests))
      // generating user password
      .then(() => {
        if (yamlSettings.generatePassword){
          return deployingApi('password', timestamp);
        } else {
          return null;
        }
      })
      .then(() => {

        // generate url
        let commandData = {};
        commandData.command = 'url';
        commandData.timestamp = timestamp;

        return $.ajax({
          type: 'POST',
          url: '/api/deploying',
          data: JSON.stringify(commandData),
          contentType: 'application/json; charset=utf-8',
          dataType: 'json',
          success: (commandDataResponse) => {
            update_status(`Generated a login url: ${commandDataResponse.message}`);

            const url = commandDataResponse.message;

            $('#loginUrl').attr('href', url);
            $('#loginUrl').text(`${url.substring(0, 80)}...`);
            $('#loginBlock').show();
            $('div#loaderBlock').hide();

            // clean up
            commandData = {};
            commandData.command = 'clean';
            commandData.timestamp = timestamp;
          }
        }).then(() => {
          return deployingApi('clean', timestamp)
            .then(() => {

              message = `Finished. You have deployed the app to your scratch org!\n\n${message}`;
              $('textarea#status').val(message);

            });
        });
      });
  }

  const githubRepo = $('input#template').val();
  let yamlFile = githubRepo.replace('github.com', 'raw.githubusercontent.com');
  yamlFile += '/master/.salesforcedx.yaml';

  const yamlSettings = {};

  $.ajax({
    url: yamlFile,
    type: 'GET',
    error: (XMLHttpRequest, textStatus, errorThrown) => {

      yamlSettings.assignPermset = 'false';
      yamlSettings.permsetName = '';
      yamlSettings.deleteScratchOrg = 'false';
      yamlSettings.runApexTests = 'false';
      yamlSettings.scratchOrgDef = 'config/project-scratch-def.json';
      yamlSettings.showScratchOrgUrl = 'true';
      yamlSettings.executeApex = [];

      update_status(`Didn't find a .salesforcedx.yaml file. Using defaults:
\tassign-permset: ${yamlSettings.assignPermset}
\tpermset-name: ${yamlSettings.permsetName}
\tdelete-scratch-org: ${yamlSettings.deleteScratchOrg}
\trun-apex-tests: ${yamlSettings.runApexTests}
\tscratch-org-def: ${yamlSettings.scratchOrgDef}
\tshow-scratch-org-url: ${yamlSettings.showScratchOrgUrl}`);

      deploy(yamlSettings, githubRepo);

    },
    success: (yamlFileDataResponse, status) => {

      update_status(`Discovered ${yamlFile}`);

      const doc = jsyaml.load(yamlFileDataResponse);

      yamlSettings.assignPermset = doc['assign-permset'];
      yamlSettings.permsetName = doc['permset-name'];
      yamlSettings.deleteScratchOrg = doc['delete-scratch-org'];
      yamlSettings.runApexTests = doc['run-apex-tests'];
      yamlSettings.scratchOrgDef = doc['scratch-org-def'];
      yamlSettings.showScratchOrgUrl = doc['show-scratch-org-url'];
      yamlSettings.executeApex = doc['execute-apex'];
      yamlSettings.executeApexPost = doc['execute-apex-post-import'];
      yamlSettings.generatePassword = doc['generate-password'];
      yamlSettings.dataImport = doc['data-import'];
      yamlSettings.packagesPre = doc['package-pre-source'];
      yamlSettings.packagesPost = doc['package-post-source'];

      update_status(`Parsed the following values from the yaml file:
\tassign-permset: ${yamlSettings.assignPermset}
\tpermset-name: ${yamlSettings.permsetName}
\tdelete-scratch-org: ${yamlSettings.deleteScratchOrg}
\trun-apex-tests: ${yamlSettings.runApexTests}
\tscratch-org-def: ${yamlSettings.scratchOrgDef}
\texecute-apex: ${yamlSettings.executeApex}
\texecute-apex-post-import: ${yamlSettings.executeApexPost}
\tpackage-pre-source: ${yamlSettings.packagesPre}
\tpackage-post-source: ${yamlSettings.packagesPost}
\tdata-import: ${yamlSettings.dataImport}
\tgenerate-password: ${yamlSettings.generatePassword}
\tshow-scratch-org-url: ${yamlSettings.showScratchOrgUrl}`);

      deploy(yamlSettings, githubRepo);

    }
  });
});