$(document).ready(function () {

  $('#yes').click(function () {

    var template = $('input[name=options]:checked').val();
    var guid = $('input#guid').val();

    window.location.href = '/deploying?template=' + template + '&guid=' + guid;

  });

  $('#no').click(function () {
    window.location.href = '/';
  });
});