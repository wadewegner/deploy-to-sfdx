$(document).ready(function () {

  $("#yes").click(function () {

    var template = $('input[name=options]:checked').val();

    if (template) {
      window.location.href = "/deploying?template=" + template;
    } else {
      alert('You must select a repo.');
    }
  });

  $("#no").click(function () {
    window.location.href = "/";
  });
});