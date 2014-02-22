var https = require('https'),
  fs = require('fs');

function ClientSSLSecurity(keyPath, certPath) {
  this.key = fs.readFileSync(keyPath);
  this.cert = fs.readFileSync(certPath);
}

ClientSSLSecurity.prototype.toXML = function(headers) {
  return "";
};

ClientSSLSecurity.prototype.addOptions = function(options) {
  options.key = this.key;
  options.cert = this.cert;
  options.agent = new https.Agent(options);
};

module.exports = ClientSSLSecurity;