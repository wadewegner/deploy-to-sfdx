$(document).ready(() => {

  let actionCount = 0;
  let message = '';

  function update_status(newMessage) {
    actionCount += 1;
    newMessage = newMessage.replace(/^\s+|\s+$/g, '');
    message = `${actionCount}) ${newMessage}\n${message}`;
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
      success: (commandDataResponse) => {
        update_status(`${commandDataResponse.message}`);
      }
    });
  }

  const githubRepo = $('input#template').val();
  let yamlFile = githubRepo.replace('github.com', 'raw.githubusercontent.com');
  yamlFile += '/master/.salesforcedx.yaml';

  $.ajax({
    url: yamlFile,
    type: 'GET',
    success: (yamlFileDataResponse, status) => {

      update_status(`Discovered ${yamlFile}`);

      const doc = jsyaml.load(yamlFileDataResponse);

      const timestamp = new Date().getTime().toString();

      const assignPermset = doc['assign-permset'];
      const permsetName = doc['permset-name'];
      const deleteScratchOrg = doc['delete-scratch-org'];
      const runApexTests = doc['run-apex-tests'];
      const scratchOrgDef = doc['scratch-org-def'];
      const showScratchOrgUrl = doc['show-scratch-org-url'];

      update_status(`Parsed the following values from the yaml file:
\tassign-permset: ${assignPermset}
\tpermset-name: ${permsetName}
\tdelete-scratch-org: ${deleteScratchOrg}
\trun-apex-tests: ${runApexTests}
\tscratch-org-def: ${scratchOrgDef}
\tshow-scratch-org-url: ${showScratchOrgUrl}`);

      return deployingApi('clone', timestamp, githubRepo)
        // .then(() => {
        //   return deployingApi('auth', timestamp);
        // })
        .then(() => {
          return deployingApi('create', timestamp, scratchOrgDef);
        })
        .then(() => {
          return deployingApi('push', timestamp);
        })
        .then(() => {
          if (permsetName) {
            return deployingApi('permset', timestamp, permsetName);
          } else {
            return null;
          }
        })
        .then(() => {
          return deployingApi('test', timestamp);
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

                message = `Finished. You have deployed the app to Salesforce DX!\n\n${message}`;
                $('textarea#status').val(message);

              });
          });
        });
    }
  });
});