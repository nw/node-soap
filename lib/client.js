/*
 * Copyright (c) 2011 Vinay Pulim <vinay@milewise.com>
 * MIT Licensed
 */

"use strict";

var assert = require('assert'),
  url = require('url'),
  WSDL = require('./wsdl'),
  EventEmitter = require('events').EventEmitter,
  util = require('util'),
  utils = require('./utils'),
  findKey = utils.findKey;

var Client = function(wsdl, options, cb) {
  var self = this;
  
  EventEmitter.call(this);
  
  options = options || {};
  
  this.isReady = false;
  
  if (typeof wsdl === 'object'){
    options = wsdl;
    wsdl = null;
  } else if (typeof wsdl === 'function'){
    cb = wsdl;
    wsdl = null;
  } else if (!wsdl){
    wsdl = null;
  }
  
  if(typeof cb === 'function') options.ready = cb;
  
  this.options = utils.extend({
    security: null
  , request: null
  , soapHeaders: null // []
  , soapAction: null
  , headers: null
  , ready: null
  , endpoint: null
  }, options);
  
  // This is to support existing api (callback)
  if(this.options.ready){
    var callback = this.options.ready;
    
    this.once('load', function(client){
      callback(null, client);
    });
    
    this.on('error', function(err){
      callback(err);
    });
  }
  
  if(wsdl) this.load(wsdl);
  
  return this;
  
};

util.inherits(Client, EventEmitter);

Client.prototype.load = function load(wsdl){
  var self = this;
  
  if(wsdl instanceof WSDL.WSDL){
    this.wsdl = wsdl;
    this.isReady = true;
    this._initializeServices();
  } else if(typeof wsdl === 'string'){
    WSDL.load(wsdl, this.options, function(err, wsdl){
      if(err) return self.emit('error', err);
      self.load(wsdl);
    });
  } else {
    this.emit('error', new Error('not an instanceof WSDL'));
  }
  
  return this;
};

Client.prototype.addSoapHeader = function(soapHeader, name, namespace, xmlns) {
  if (!this.soapHeaders) {
    this.soapHeaders = [];
  }
  if (typeof soapHeader === 'object') {
    soapHeader = this.wsdl.objectToXML(soapHeader, name, namespace, xmlns);
  }
  this.soapHeaders.push(soapHeader);
};

Client.prototype.setEndpoint = function(endpoint) {
  this.options.endpoint = endpoint;
  if(this.isReady) this._initializeServices();
};

Client.prototype.describe = function() {
  return (this.isReady && this.wsdl) ? this.wsdl.describeServices() : null;
};

Client.prototype.setSecurity = function(security) {
  this.options.security = security;
};

Client.prototype.setSOAPAction = function(SOAPAction) {
  this.options.SOAPAction = SOAPAction;
};

Client.prototype._initializeServices = function() {
  var definitions = this.wsdl.definitions,
    services = definitions.services;
  for (var name in services) {
    this[name] = this._defineService(services[name]);
  }
  this.emit('load', this);
};

Client.prototype._defineService = function(service) {
  var ports = service.ports,
    endpoint = this.options.endpoint,
    def = {};
  for (var name in ports) {
    def[name] = this._definePort(ports[name], endpoint ? endpoint : ports[name].location);
  }
  return def;
};

Client.prototype._definePort = function(port, endpoint) {
  var location = endpoint,
    binding = port.binding,
    methods = binding.methods,
    def = {};
  for (var name in methods) {
    def[name] = this._defineMethod(methods[name], location);
    this[name] = def[name];
  }
  return def;
};

Client.prototype._defineMethod = function(method, location) {
  var self = this;
  return function(args, callback, options) {
    if (typeof args === 'function') {
      callback = args;
      args = {};
    }

    self._invoke(method, args, location, function(error, result, raw) {
      callback(error, result, raw);
    }, options);
  };
};

Client.prototype._invoke = function(method, args, location, callback, options) {
  var self = this,
    name = method.$name,
    input = method.input,
    output = method.output,
    style = method.style,
    defs = this.wsdl.definitions,
    ns = defs.$targetNamespace,
    encoding = '',
    message = '',
    xml = null,
    soapAction = this.SOAPAction ? this.SOAPAction(ns, name) : (method.soapAction || (((ns.lastIndexOf("/") !== ns.length - 1) ? ns + "/" : ns) + name)),
    headers = {
      SOAPAction: '"' + soapAction + '"',
      'Content-Type': "text/xml; charset=utf-8"
    },
    alias = findKey(defs.xmlns, ns);

  options = options || {};

  // Allow the security object to add headers
  if (self.security && self.security.addHeaders)
    self.security.addHeaders(headers);
  if (self.security && self.security.addOptions)
    self.security.addOptions(options);

  if (input.parts) {
    if(style && style !== 'rpc'){
      self.emit('error', new Error('invalid message definition for document style binding'));
    }

    message = self.wsdl.objectToRpcXML(name, args, alias, ns);
    (method.inputSoap === 'encoded') && (encoding = 'soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" ');
  } else if (typeof (args) === 'string') {
    message = args;
  } else {
    
    if(style && style !== 'document'){
      self.emit('error', 'invalid message definition for rpc style binding');
    }

    message = self.wsdl.objectToDocumentXML(input.$name, args, input.targetNSAlias, input.targetNamespace);
  }
  xml = "<soap:Envelope " +
    "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" " +
    encoding +
    this.wsdl.xmlnsInEnvelope + '>' +
    "<soap:Header>" +
    (self.soapHeaders ? self.soapHeaders.join("\n") : "") +
    (self.security ? self.security.toXML() : "") +
    "</soap:Header>" +
    "<soap:Body>" +
    message +
    "</soap:Body>" +
    "</soap:Envelope>";

  self.lastRequest = xml;

  utils.request(location, xml, self.options, function(err, response, body) {
    var result;
    var obj;
    self.lastResponse = body;
    self.lastResponseHeaders = response && response.headers;
    if (err) {
      callback(err);
    } else {
      try {
        obj = self.wsdl.xmlToObject(body);
      } catch (error) {
        error.response = response;
        error.body = body;
        return callback(error, response, body);
      }

      result = obj.Body[output.$name];
      // RPC/literal response body may contain elements with added suffixes I.E.
      // 'Response', or 'Output', or 'Out'
      // This doesn't necessarily equal the ouput message name. See WSDL 1.1 Section 2.4.5
      if(!result){
        result = obj.Body[output.$name.replace(/(?:Out(?:put)?|Response)$/, '')];
      }

      callback(null, result, body);
    }
  });
};

exports.Client = Client;
