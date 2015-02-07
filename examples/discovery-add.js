// examples/discovery-add.js
// Discovery add
'use strict';

var Ceo = require('../index')

Ceo(function(err, ceo) {
  var json = JSON.stringify(ceo.about)
  console.log(json)
  ceo.discovery.add()
  setTimeout(function shutdown(){
    console.log('shutting down')
    ceo.discovery.remove()
    setTimeout(function halt() {
      process.exit(0)
    }, 200)
  }, 2000)
//  process.exit(0)
})
