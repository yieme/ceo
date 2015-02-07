// Test: examples/discovery-add.js
// Discovery add example text
'use strict';

var should = require('should')
var exec   = require('child_process').exec

describe('example', function() {
  this.timeout(20000)
  it('Discovery add', function(done) {
  exec('export firebase=name:ceo; node examples/discovery-add.js', function (error, stdout, stderr) {
    if (error) throw error
//      stdout.slice(0,-1).should.equal("output")
      stderr.should.equal('')
      done()
    })
  })
})
