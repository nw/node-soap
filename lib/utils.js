
"use strict";

var crypto = require('crypto');

var url = require('url');
var req = require('request');
var extend = require('extend');

var VERSION = require('../package.json').version;

exports.request = function(rurl, data, options, callback) {
  var curl = url.parse(rurl);
  var secure = curl.protocol === 'https:';
  var host = curl.hostname;
  var port =  curl.port = curl.port || (secure ? 443 : 80);
  var path = [curl.pathname || '/', curl.search || '', curl.hash || ''].join('');
  var method = data ? "POST" : "GET";
  var headers = {
    "User-Agent": "node-soap/" + VERSION,
    "Accept" : "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "none",
    "Accept-Charset": "utf-8",
    "Connection": "close",
    "Host" : host + (port ? ":"+port : "")
  };
  var attr;
  
  options = options || {};

  if (typeof data === 'string') {
    headers["Content-Length"] = Buffer.byteLength(data, 'utf8');
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  var req_options = exports.extend(true, {
    uri: curl,
    method: method,
    headers: headers,
  }, options);

  var request = req(req_options, function (error, res, body) {
    if (error) {
      callback(error);
    } else {
      request.on('error', callback);
      callback(null, res, body);
    }
  });
  request.end(data);
};



exports.passwordDigest = function passwordDigest(nonce, created, password) {
  // digest = base64 ( sha1 ( nonce + created + password ) )
  var pwHash = crypto.createHash('sha1');
  var rawNonce = new Buffer(nonce || '', 'base64').toString('binary');
  pwHash.update(rawNonce + created + password);
  return pwHash.digest('base64');
};

exports.findKey = function findKey(obj, val) {
  for (var n in obj)
    if (obj[n] === val)
      return n;
};

exports.splitNSName = function splitNSName(nsName) {
  var i = typeof nsName === 'string' ? nsName.indexOf(':') : -1;
  return i < 0 ? {namespace: null, name: nsName} : {namespace: nsName.substring(0, i), name: nsName.substring(i + 1)};
};

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
};

var trimLeft = /^[\s\xA0]+/;
var trimRight = /[\s\xA0]+$/;

exports.trim = function trim(text) {
  return text.replace(trimLeft, '').replace(trimRight, '');
};


exports.extend = extend;


