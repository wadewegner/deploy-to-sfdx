$(document).ready(function () {

  let actionCount = 0;
  let message = '';

  function update_status(newMessage) {
    actionCount += 1;
    newMessage = newMessage.replace(/^\s+|\s+$/g, '');
    message = `${actionCount}) ${newMessage}\n${message}`;
    $('textarea#status').val(message);
  }

  let githubRepo = $('input#template').val();

  let yamlFile = githubRepo.replace('github.com', 'raw.githubusercontent.com');
  yamlFile += '/master/.salesforcedx.yaml';

  update_status(`Checking for ${yamlFile}`);

  $.ajax({
    url: yamlFile,
    type: 'GET',
    success: (yamlFileDataResponse, status) => {

      update_status(`Discovered ${yamlFile}`);

      var doc = jsyaml.load(yamlFileDataResponse);

      const assignPermset = doc['assign-permset'];
      const deleteScratchOrg = doc['delete-scratch-org'];
      const runApexTests = doc['run-apex-tests'];
      const scratchOrgDef = doc['scratch-org-def'];
      const showScratchOrgUrl = doc['show-scratch-org-url'];

      update_status(`Parsed the following values from the yaml file:
\tassign-permset: ${assignPermset}
\tdelete-scratch-org: ${deleteScratchOrg}
\trun-apex-tests: ${runApexTests}
\tscratch-org-def: ${scratchOrgDef}
\tshow-scratch-org-url: ${showScratchOrgUrl}`);

      // clone org
      let commandData = {};
      commandData.command = 'clone';
      commandData.param = githubRepo;

      $.ajax({
        type: 'POST',
        url: '/api/deploying',
        data: JSON.stringify(commandData),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: (commandDataResponse) => {
          update_status(`${commandDataResponse.message}`);

          // create org
          commandData = {};
          commandData.command = 'create';
          commandData.param = scratchOrgDef;

          $.ajax({
            type: 'POST',
            url: '/api/deploying',
            data: JSON.stringify(commandData),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: (commandDataResponse) => {
              update_status(`${commandDataResponse.message}`);

              // push source
              commandData = {};
              commandData.command = 'push';

              $.ajax({
                type: 'POST',
                url: '/api/deploying',
                data: JSON.stringify(commandData),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                success: (commandDataResponse) => {
                  update_status(`${commandDataResponse.message}`);

                  // run tests
                  commandData = {};
                  commandData.command = 'test';

                  $.ajax({
                    type: 'POST',
                    url: '/api/deploying',
                    data: JSON.stringify(commandData),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    success: (commandDataResponse) => {
                      update_status(`${commandDataResponse.message}`);

                      // generate url
                      commandData = {};
                      commandData.command = 'url';

                      $.ajax({
                        type: 'POST',
                        url: '/api/deploying',
                        data: JSON.stringify(commandData),
                        contentType: 'application/json; charset=utf-8',
                        dataType: 'json',
                        success: (commandDataResponse) => {
                          update_status(`Login URL: ${commandDataResponse.message}`);

                          const url = commandDataResponse.message;
                          $("#loginUrl").attr("href", url);
                          $("#loginUrl").text(`${url.substring(0, 80)}...`);

                          $('#loginBlock').show();

                          // clean up
                          commandData = {};
                          commandData.command = 'clean';

                          $.ajax({
                            type: 'POST',
                            url: '/api/deploying',
                            data: JSON.stringify(commandData),
                            contentType: 'application/json; charset=utf-8',
                            dataType: 'json',
                            success: (commandDataResponse) => {
                              update_status(`${commandDataResponse.message}`);

                              message = `DONE!\n\n${message}`;
                              $('textarea#status').val(message);
                            }
                          });
                        }
                      });

                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});