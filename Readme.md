This module lets you connect to web services using SOAP.  It also provides a server that allows you to run your own SOAP services.

[![Build Status](https://travis-ci.org/vpulim/node-soap.png?branch=master)](https://travis-ci.org/vpulim/node-soap)

Features:

* Very simple API
* Handles both RPC and Document schema types
* Supports multiRef SOAP messages (thanks to [@kaven276](https://github.com/kaven276))
* Support for both synchronous and asynchronous method handlers
* WS-Security (currently only UsernameToken and PasswordText encoding is supported)

## Install

Install with [npm](http://github.com/isaacs/npm):

```
  npm install soap
```
## Module

### soap.createClient(url, callback) - create a new SOAP client from a WSDL url. Also supports a local filesystem path.

``` javascript
  var soap = require('soap');
  var url = 'http://example.com/wsdl?wsdl';
  var args = {name: 'value'};
  soap.createClient(url, function(err, client) {
      client.MyFunction(args, function(err, result) {
          console.log(result);
      });
  });
```

### soap.listen(*server*, *path*, *services*, *wsdl*) - create a new SOAP server that listens on *path* and provides *services*.
*wsdl* is an xml string that defines the service.

``` javascript
  var myService = {
      MyService: {
          MyPort: {
              MyFunction: function(args) {
                  return {
                      name: args.name
                  };
              }

              // This is how to define an asynchronous function.  
              MyAsyncFunction: function(args, callback) {
                  // do some work
                  callback({
                      name: args.name
                  })
              }
          }
      }
  }

  var xml = require('fs').readFileSync('myservice.wsdl', 'utf8'),
      server = http.createServer(function(request,response) {
          response.end("404: Not Found: "+request.url)
      });

  server.listen(8000);
  soap.listen(server, '/wsdl', myService, xml);
```

### server logging

If the log method is defined it will be called with 'received' and 'replied'
along with data.

``` javascript
  server = soap.listen(...)
  server.log = function(type, data) {
    // type is 'received' or 'replied'
  };
```

### server security example using PasswordDigest

If server.authenticate is not defined no authentation will take place.

``` javascript
  server = soap.listen(...)
  server.authenticate = function(security) {
    var created, nonce, password, user, token;
    token = security.UsernameToken, user = token.Username,
            password = token.Password, nonce = token.Nonce, created = token.Created;
    return user === 'user' && password === soap.passwordDigest(nonce, created, 'password');
  };
```

### server connection authorization

This is called prior to soap service method
If the method is defined and returns false the incoming connection is
terminated.

``` javascript
  server = soap.listen(...)
  server.authorizeConnection = function(req) {
    return true; // or false
  };
```


## Client

An instance of Client is passed to the soap.createClient callback.  It is used to execute methods on the soap service.

For more control use the Client directly.

### Options

  - security: A security interface instance (see below)
  - request: Properties you want to pass to 'request' directly (object)
  - soapHeaders: Additional soapHeader (array) // recommended you use client.addSoapHeader
  - soapAction: A function to invoke
  - headers: An object to attach additional headers to the request
  - endpoint: url
  - ready: A fn to call when Client is ready // mainly used for compat

### Instance

``` javascript

    var client = new Soap.Client(endpoint, {
      security: new Soap.Security.basic('user', pass)
    , request: {
        rejectUnauthorized: false
      , secureOptions: constants.SSL_OP_NO_TLSv1_2 }
    });

    client.once('load', function(client){
        console.log(client.describe());
    });

    client.on('error', function(err){
      console.log(err);
    });
    
```

or you can defer loading until your ready by not passing a WSDL instance or a string (url) as the first parameter.
Passing nothing, options or callback as first parameter will invoke this behavior.

``` javascript

    var client = new Soap.Client(function(client){
      console.log(client.describe());
    });
    
    client.on('error', function(err){
      // handle error
    });

    client.addSecurity(new Soap.Security.basic(user, pass));
    client.setEndpoint(endpoint);
    
    Soap.WSDL.fetch(url, options, function(err, wsdl){
      if(err) return client.emit('error', err);
      assert.ok(Soap.WSDL.cache[url] === wsdl); // fetch uses wsdl caching
      client.load(wsdl);
    });
    
```

If you do not pass in a callback function or set `options.ready` then you must register your own event listner.

``` javascript

    var client = new Soap.Client({
      security: new Soap.Security.clientSSL(key, cert)
      request: {strictSSL: true}
    });

    client.once('load', function(client){
      // start using the service
    });

    client.load(url);

```

Client no longer throws unless you do not listen for 'error'.


### Client.describe() - description of services, ports and methods as a JavaScript object

``` javascript
  client.describe() // returns
    {
      MyService: {
        MyPort: {
          MyFunction: {
            input: {
              name: 'string'
            }
          }
        }
      }
    }
```

### Client.setSecurity(security) - use the specified security protocol (see WSSecurity below)

``` javascript
  client.setSecurity(new WSSecurity('username', 'password'))
```

### Client.*method*(payload, options, callback) - call *method* on the SOAP service.

``` javascript
  client.MyFunction({name: 'value'}, function(err, result) {
      // result is a javascript object
  })
```
### Client.*service*.*port*.*method*(payload,  options, callback) - call a *method* using a specific *service* and *port*

``` javascript
  client.MyService.MyPort.MyFunction({name: 'value'}, function(err, result) {
      // result is a javascript object
  })
```
### Client.*addSoapHeader*(soapHeader[, name, namespace, xmlns]) - add soapHeader to soap:Header node
#### Options

 - `soapHeader`     Object({rootName: {name: "value"}}) or strict xml-string

##### Optional parameters when first arg is object :
 - `name`           Unknown parameter (it could just a empty string)
 - `namespace`      prefix of xml namespace
 - `xmlns`          URI

### Client.*lastRequest* - the property that contains last full soap request for client logging

## WSDL

### WSDL.*cache*  - object of cached wsdl objects

### WSDL.*load*(url, options, callback) - checks cache, loads if not present and caches.

### WSDL.*fetch*(url, options, callback) - like load but bypasses cache.



## WSSecurity

WSSecurity implements WS-Security.  UsernameToken and PasswordText/PasswordDigest is supported. An instance of WSSecurity is passed to Client.setSecurity.

``` javascript
  new WSSecurity(username, password, passwordType)
    //'PasswordDigest' or 'PasswordText' default is PasswordText
```
