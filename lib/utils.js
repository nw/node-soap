var crypto = require('crypto');

exports.passwordDigest = function passwordDigest(nonce, created, password) {
  // digest = base64 ( sha1 ( nonce + created + password ) )
  var pwHash = crypto.createHash('sha1');
  var rawNonce = new Buffer(nonce || '', 'base64').toString('binary');
  pwHash.update(rawNonce + created + password);
  var passwordDigest = pwHash.digest('base64');
  return passwordDigest;
};

exports.findKey = function findKey(obj, val) {
  for (var n in obj)
    if (obj[n] === val)
      return n;
};

exports.splitNSName = function splitNSName(nsName) {
  var i = typeof nsName === 'string' ? nsName.indexOf(':') : -1;
  return i < 0 ? {namespace: null, name: nsName} : {namespace: nsName.substring(0, i), name: nsName.substring(i + 1)};
}

exports.xmlEscape = function xmlEscape(obj) {
  if (typeof (obj) === 'string') {
    return obj
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  return obj;
}

var trimLeft = /^[\s\xA0]+/;
var trimRight = /[\s\xA0]+$/;

exports.trim = function trim(text) {
  return text.replace(trimLeft, '').replace(trimRight, '');
};

exports.extend = function extend(base, obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      base[key] = obj[key];
    }
  }
  return base;
};
