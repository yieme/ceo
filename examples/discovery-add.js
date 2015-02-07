// examples/discovery-add.js
// Discovery add
'use strict';

var Ceo = require('../index')

Ceo(function(err, ceo) {
  var json = JSON.stringify(ceo.about)
  console.log(json)
  var id = ceo.discovery.add()
  console.log('id:', id)
  setTimeout(function shutdown(){
    console.log('shutting down')
    ceo.discovery.remove()
    setTimeout(function halt() {
      process.exit(0)
    }, 200)
  }, 3000)
//  process.exit(0)
})
