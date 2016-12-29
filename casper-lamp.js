var casper = require('casper').create({
  //logLevel: 'debug',
  verbose: true
});
var url = 'http://156.17.205.137:3000/ois';

casper.on('remote.message', function(message) {
    this.echo(message);
});

casper.start(url, function() {
  this.evaluate(function sendLog(log) {
  }, this.result.log);
});

casper.waitFor(function check() {
    return this.evaluate(function() {
        return document.querySelector('#hebel');
    });
}, function then() {
    this.wait(2500, function() {
      this.click('#hebel', '50%', '50%');
    });
});

casper.then(function() {
  this.wait(2500, function() {
    var switchState = this.getElementInfo('#hebel').attributes.class.split(' ')[1].split('_')[1];
    this.echo("SWITCHED: " + switchState);
  });
});

casper.run();
