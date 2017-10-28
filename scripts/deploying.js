$(document).ready(() => {

  function update_status(newMessage, excludeCount) {
    let message = '';

    if (excludeCount) {
      message = `${newMessage}\n${message}`;
    } else {
      newMessage = newMessage.replace(/^\s+|\s+$/g, '');
      message = `${newMessage}\n${message}`;
    }

    $('textarea#status').val(message);
  }

  function poll(stage) {

    var complete = false;
    var data = {};
    data.guid = guid;

    $.ajax({
      url: '/api/status',
      type: 'POST',
      data: data,
      success: function (response) {

        var message = response.message;
        complete = response.complete;
        var scratch_url = response.scratch_url;

        update_status(message);

        if (complete) {
          $('#loginUrl').attr('href', scratch_url);
          $('#loginUrl').text(`${scratch_url.substring(0, 80)}...`);
          $('#loginBlock').show();
          $('div#loaderBlock').hide();
        }
      },
      dataType: 'json',
      complete: setTimeout(function () {
        if (!complete) {
          poll(stage);
        }
      }, 2500),
      timeout: 2000
    });
  }

  function createJob(settings) {

    $.ajax({
      type: 'POST',
      url: '/api/deploy',
      data: JSON.stringify(settings),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      async: false,
      success: () => {
        // guid = commandDataResponse.message;
        // update_status(`Started job: ${settings.guid}`);
      },
      error: (commandDataResponse) => {
        update_status(`Sorry, something went wrong. Please contact @WadeWegner on Twitter and send the following error message.\n\nError: ${commandDataResponse.responseText}\n`, true);
        $('div#loaderBlock').hide();
      }
    });

    // return deployingApi('clone', timestamp, githubRepo)
    //   .then(() => {
    //     return deployingApi('create', timestamp, yamlSettings.scratchOrgDef);
    //   })
    //   .then(() => {
    //     return deployingApi('push', timestamp);
    //   })
    //   .then(() => {
    //     if (yamlSettings.permsetName) {
    //       return deployingApi('permset', timestamp, yamlSettings.permsetName);
    //     } else {
    //       return null;
    //     }
    //   })
    //   .then(() => {
    //     return deployingApi('test', timestamp, yamlSettings.runApexTests);
    //   })
    //   .then(() => {

    //     // generate url
    //     let commandData = {};
    //     commandData.command = 'url';
    //     commandData.timestamp = timestamp;

    //     return $.ajax({
    //       type: 'POST',
    //       url: '/api/deploying',
    //       data: JSON.stringify(commandData),
    //       contentType: 'application/json; charset=utf-8',
    //       dataType: 'json',
    //       success: (commandDataResponse) => {
    //         update_status(`Generated a login url: ${commandDataResponse.message}`);

    //         const url = commandDataResponse.message;

    //         $('#loginUrl').attr('href', url);
    //         $('#loginUrl').text(`${url.substring(0, 80)}...`);
    //         $('#loginBlock').show();
    //         $('div#loaderBlock').hide();

    //         // clean up
    //         commandData = {};
    //         commandData.command = 'clean';
    //         commandData.timestamp = timestamp;
    //       }
    //     }).then(() => {
    //       return deployingApi('clean', timestamp)
    //         .then(() => {

    //           message = `Finished. You have deployed the app to your scratch org!\n\n${message}`;
    //           $('textarea#status').val(message);

    //         });
    //     });
    //   });
  }

  const githubRepo = $('input#template').val();
  const guid = $('input#guid').val();



  let yamlFile = githubRepo.replace('github.com', 'raw.githubusercontent.com');
  yamlFile += '/master/.salesforcedx.yaml';

  const settings = {};
  settings.githubRepo = githubRepo;
  settings.guid = guid;

  $.ajax({
    url: yamlFile,
    type: 'GET',
    async: false,
    error: (XMLHttpRequest, textStatus, errorThrown) => {

      settings.assignPermset = 'false';
      settings.permsetName = '';
      settings.deleteScratchOrg = 'false';
      settings.runApexTests = 'false';
      settings.scratchOrgDef = 'config/project-scratch-def.json';
      settings.showScratchOrgUrl = 'true';

      update_status(`Didn't find a .salesforcedx.yaml file. Using defaults:
\tassign-permset: ${settings.assignPermset}
\tpermset-name: ${settings.permsetName}
\tdelete-scratch-org: ${settings.deleteScratchOrg}
\trun-apex-tests: ${settings.runApexTests}
\tscratch-org-def: ${settings.scratchOrgDef}
\tshow-scratch-org-url: ${settings.showScratchOrgUrl}`);

    },
    success: (yamlFileDataResponse, status) => {

      update_status(`Discovered ${yamlFile}`);

      const doc = jsyaml.load(yamlFileDataResponse);

      settings.assignPermset = doc['assign-permset'];
      settings.permsetName = doc['permset-name'];
      settings.deleteScratchOrg = doc['delete-scratch-org'];
      settings.runApexTests = doc['run-apex-tests'];
      settings.scratchOrgDef = doc['scratch-org-def'];
      settings.showScratchOrgUrl = doc['show-scratch-org-url'];

      update_status(`Parsed the following values from the yaml file:
\tassign-permset: ${settings.assignPermset}
\tpermset-name: ${settings.permsetName}
\tdelete-scratch-org: ${settings.deleteScratchOrg}
\trun-apex-tests: ${settings.runApexTests}
\tscratch-org-def: ${settings.scratchOrgDef}
\tshow-scratch-org-url: ${settings.showScratchOrgUrl}`);
    }
  });

  createJob(settings);

  // alert(guid);

  poll(guid);

});