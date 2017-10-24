const async = require('async');

function foo1() {
  return new Promise((resolve) => {
    const message = 'test1';
    console.log(message);
    resolve(message);
  });
}

function foo2(message) {
  return new Promise((resolve) => {
  message += 'test2';
  resolve(message);
  return message;
  });
}

async.whilst(
  () => true,
  (callback) => {

    console.log('worker', 'callback started ...');

    foo1()
      .then(message => foo2(message))
      .then(() => {
        console.log('done');
      });

    // foo1().then()


    // .then((message) => { foo2(message); });
    // .then((message) => {
    //   message += 'test2';
    //   console.log(message);
    // });

    setTimeout(() => {
      callback(null, true);
    }, 1000);
  },
  (err) => {
    console.log(`err: ${err}`);
  }
);