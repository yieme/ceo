var O = require('./index.js')

O.init(function() {
  var kv = O.keystore()
//  kv.put('first', 'val2', function() {
//    O.exit()
//  })
  kv.get('first', console.log)
  kv.put('second', Math.random())
})
