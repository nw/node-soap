"use strict";

var Client = require('./client'),
  Server = require('./server').Server,
  WSDL = require('./wsdl'),
  security = require('./security'),
  util = require('./utils');

function createClient(url, options, callback, endpoint) {
  if (typeof options === 'function') {
    endpoint = callback;
    callback = options;
    options = {};
  }
  
  if(!options.endpoint) options.endpoint = endpoint;

  return new Client(url, options, callback);
}


function listen(server, pathOrOptions, services, xml) {
  var options = {},
    path = pathOrOptions;

  if (typeof pathOrOptions === 'object') {
    options = pathOrOptions;
    path = options.path;
    services = options.services;
    xml = options.xml;
  }

  var wsdl = new WSDL.WSDL(xml || services, null, options);
  return new Server(server, path, services, wsdl);
}

exports.Client = Client;
exports.Security = security;
exports.createClient = createClient;
exports.listen = listen;
exports.WSDL = WSDL;