"use strict";

var scope          = this
  , logger         = { info: console.log, warn: console.log, error: console.log, fatal: console.log }
  , Firebase       = require('firebase')
  , TokenGenerator = require("firebase-token-generator")
  , Dias           = require('dias')                     // angleman/dias. Detect PaaS details
  , mergeObjects   = require('./src/merge-objects')
  , fs             = require('fs')
  , os             = require('os')
  , exit           = require('./src/service-exit')
  , outcome        = require('outcome')
  , on             = outcome(function(err) { exit(err) })
  , getvar         = require('./src/getvar')
  , Firelease      = require('firelease')
  , Firestore      = require('./src/firestore')
  , initLogger     = require('./src/service-logger')
  , config         = getvar('orchestratr') || '{}'
;

try { config = JSON.parse(config) } catch (e) {}


function getServiceId(dias, callback) {
  try {
    var idPack = {
      uid:  999,  // replace below
      name: getvar.package.name,
      ver:  getvar.package.version,
      env:  getvar.node_env(), // dev, stage, canary, production
      paas: (dias.os == 'OSX')  ? undefined     : dias.paas,
      dc:   (dias.aws)          ? dias.aws.zone : (dias.appfog)       ? dias.appfog.center : (dias.os == 'OSX') ? 'local' : undefined,
      os:   dias.os + '/' + dias.version,
      box:  getvar('box') || dias.serial,
      glot: 'node/' + dias.node, // polyglot, ie application language
    }
    idPack.uid = getvar.package.name + ':' + dias.serial + ':' + process.pid
    idPack.uid = idPack.uid.split('.').join('-')
  } catch (err) {
    callback(err)
  }
  callback(null, idPack)
}



function initFirebase(servicePack, callback) {
  var firebase  = new Firebase(getvar('firebase_url', 1))
  var token     = getvar('firebase_token')
  , authToken = token
  if (token) {
    console.log('box:', servicePack.box)
    var tokenGenerator = new TokenGenerator(token)
    , authToken      = tokenGenerator.createToken({
      uid:   servicePack.box,
      is:    servicePack.name + '/' + servicePack.version // enables firebase auth based on service and/or version
    })
    firebase.authWithCustomToken(authToken, on.success(function(authData) {
      callback(null, firebase)
    }))
  } else {
    callback(null, firebase)
  }
}



function getKeyValueStore(firebaseRef, path, callback) {
  new Firestore({ ref: firebaseRef, child: path }, on.success(function(store) {
    callback(null, store)
  }))
}



function Orchestratr(callback) {
  var orchestratr = this
  , firebase
  try {
    Dias({uanode: true}, function(dias) {
      getServiceId(dias, on.success(function(servicePack) {
        var logger = new initLogger(servicePack)
        exit.init(logger)
        orchestratr.about = servicePack
        orchestratr.log   = logger
        orchestratr.exit  = exit

        function multiStore(ref, area, key, callback) {
          getKeyValueStore(ref, key, on.success(function(store) { orchestratr[area] = store }))
        }

        initFirebase(servicePack, on.success(function(ref) {
          firebase = ref
          var uid   = servicePack.uid.split(':')
          uid
          var setup = [
            { area: 'public',  key: '_' },
            { area: 'global',  key: '~' }, // all services
            { area: 'kv',      key: '~/' + servicePack.name }, // service scope
            { area: 'private', key: '?/' + servicePack.name + '/' + uid[1] + ':' + uid[2]  },
          ]
          for (var i = 0; i < setup.length; i++) {
            multiStore(ref, setup[i].area, setup[i].key, function() {})
          }
          if (!getvar('DEBUG')) process.on('uncaughtException', function(err) { exit(err) })
          callback(null, orchestratr)
        }))
      }))
    })
  } catch (err) { callback(err) }
}



// process.hrtime([compare_time?]) // node up time in ns (nano). 1000ns = 1µs (micro). 1000µs = 1ms (milli). 1000ms = 1s (second)
/*
module.exports.event = function () { return getFirebaseRefs('event', [
  {                   area: '|', key: '_' }, // service common key/value store. root scope must be the first entry
  { scope: 'global',  area: '|'           }, // all key/value stores
  { scope: 'public',             key: '_' }  // public facing key/value store, firehose
])}

module.exports.health   = function () { return getFirebaseRefs('health',   [ ['global', 'g'], ['service', '$service'] ]) }
module.exports.catalog  = function () { return getFirebaseRefs('catalog',  [ ['global', 'g'], ['service', '$service'], ['node', '$node'], , ['datacenter', '$datacenter'] ]) }
*/
//module.exports.pin   = function pin(event_name, options) {} // creates O.event_name() && O.eventName() // options = { timeout: 0, first: 1, do: remoteService } || function(){} // do: shortcut
// O.attachWorker.service/global(key, options, worker) -> fireleaseRef

module.exports = Orchestratr
