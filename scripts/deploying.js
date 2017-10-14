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

    const commandData = {};
    commandData.command = command;
    commandData.timestamp = timestamp;
    commandData.param = param;

    return $.ajax({
      type: 'POST',
      url: '/api/deploying',
      data: JSON.stringify(commandData),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      timeout: 240000,
      success: (commandDataResponse) => {
        update_status(`${commandDataResponse.message}`);
      },
      error: (commandDataResponse) => {
        update_status(`Sorry, something went wrong. Please contact @WadeWegner on Twitter and send the following error message.\n\nError: ${commandDataResponse.responseText}\n`, true);
        $('div#loaderBlock').hide();
      }
    });
  }

  function deploy(yamlSettings, githubRepo) {

    const timestamp = new Date().getTime().toString();

    return deployingApi('clone', timestamp, githubRepo)
      .then(() => {
        return deployingApi('create', timestamp, yamlSettings.scratchOrgDef);
      })
      .then(() => {
        return deployingApi('push', timestamp);
      })
      .then(() => {
        if (yamlSettings.permsetName) {
          return deployingApi('permset', timestamp, yamlSettings.permsetName);
        } else {
          return null;
        }
      })
      .then(() => {
        return deployingApi('test', timestamp, yamlSettings.runApexTests);
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

      update_status(`Parsed the following values from the yaml file:
\tassign-permset: ${yamlSettings.assignPermset}
\tpermset-name: ${yamlSettings.permsetName}
\tdelete-scratch-org: ${yamlSettings.deleteScratchOrg}
\trun-apex-tests: ${yamlSettings.runApexTests}
\tscratch-org-def: ${yamlSettings.scratchOrgDef}
\tshow-scratch-org-url: ${yamlSettings.showScratchOrgUrl}`);

      deploy(yamlSettings, githubRepo);

    }
  });
});