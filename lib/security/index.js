
['basic', 'clientSSL', 'ws'].forEach(function(type){
  exports[type] = require('./' + type);
})