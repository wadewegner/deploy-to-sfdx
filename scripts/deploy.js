$(document).ready(function () {

  $("#yes").click(function () {
    var template = $('input#template').val();
    window.location.href = "/deploying?template=" + template;
  });

  $("#no").click(function () {
    window.location.href = "/";
  });
});