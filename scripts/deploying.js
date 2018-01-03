$(document).ready(() => {

  function update_status(newMessage) {

    let message = '';
    newMessage = newMessage.replace(/^\s+|\s+$/g, '');
    message = `${newMessage}<br/>${message}`;

    $('#status').text(message);
    $('#status').html($('#status').text());
  }

  function poll(guid) {

    var complete = false;
    var data = {};
    data.guid = guid;

    $.ajax({
      url: '/api/status',
      type: 'POST',
      data: data,
      success: function (response) {

        var message = response.message;
        var scratch_url = response.scratch_url;
        var stage = response.stage;
        var error_message = response.error_message;

        complete = response.complete;

        if (stage === 'error') {
          message = `${error_message}<p/><br/><p/>${message}`;
        }

        update_status(message);

        if (complete && stage === 'error') {
          $('div#loaderBlock').hide();
          $('#errorBlock').show();
        }

        if (complete && stage !== 'error') {
          $('#loginUrl').attr('href', scratch_url);
          $('#loginUrl').text(`${scratch_url.substring(0, 80)}...`);
          $('#loginBlock').show();
          $('div#loaderBlock').hide();
        }
      },
      dataType: 'json',
      complete: setTimeout(function () {
        if (!complete) {
          poll(guid);
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
        // update_status(`Started job: ${settings.guid}`);
      },
      error: (commandDataResponse) => {
        update_status(`Sorry, something went wrong. Please log an issue on github: https://github.com/wadewegner/deploy-to-sfdx/issues.\n\nError: ${commandDataResponse.responseText}\n`);
        $('div#loaderBlock').hide();
      }
    });
  }

  const githubRepo = $('input#template').val();
  const guid = $('input#guid').val();

  let yamlFile = githubRepo.replace('github.com', 'raw.githubusercontent.com');
  yamlFile += '/master/.salesforcedx.yaml';

  const settings = {};
  settings.githubRepo = githubRepo;
  settings.guid = guid;
  settings.dataPlans = [];

  $.ajax({
    url: yamlFile,
    type: 'GET',
    async: false,
    error: () => {

      settings.yamlExists = false;
      settings.sfdxSource = true;
      settings.sourceFolder = '';
      settings.assignPermset = 'false';
      settings.permsetName = '';
      settings.deleteScratchOrg = 'false';
      settings.runApexTests = 'false';
      settings.scratchOrgDef = 'config/project-scratch-def.json';
      settings.showScratchOrgUrl = 'true';
      settings.openPath = '';

    },
    success: (yamlFileDataResponse) => {

      const doc = jsyaml.load(yamlFileDataResponse);

      settings.yamlExists = true;
      if (doc['sfdx-source']) {
        settings.sfdxSource = doc['sfdx-source'];        
      } else {
        settings.sfdxSource = true;
      }
      if (!settings.sfdxSource) {
        settings.sourceFolder = doc['source-folder'];
      }
      settings.assignPermset = doc['assign-permset'];
      settings.permsetName = doc['permset-name'];
      settings.deleteScratchOrg = doc['delete-scratch-org'];
      settings.runApexTests = doc['run-apex-tests'];
      settings.scratchOrgDef = doc['scratch-org-def'];
      settings.showScratchOrgUrl = doc['show-scratch-org-url'];
      settings.openPath = doc['open-path'];

      const dataPlanCount = doc['data-plans'] ? doc['data-plans'].length : 0;

      if (dataPlanCount > 0) {
        
        for (var i = 0; i < dataPlanCount; i++) {
          const dataPlan = doc['data-plans'][i];
          settings.dataPlans.push(dataPlan);
        }
      }
    }
  });

  createJob(settings);

  poll(guid);

});