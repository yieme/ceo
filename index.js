"use strict";

var scope           = this
  , convar          = require('convar')
  , newrelic        = (convar('newrelic')) ? require('newrelic') : false
  , logger          = { info: console.log, warn: console.log, error: console.log, fatal: console.log }
  , Firebase        = require('firebase')
  , firebaseConfig  = convar('firebase', 'firebase config with url is required')
  , TokenGenerator  = require("firebase-token-generator")
  , Dias            = require('dias')                     // angleman/dias. Detect PaaS details
  , exit            = require('./src/service-exit')
  , firebaseSafeKey = require('./src/firebase-safe-key')
  , outcome         = require('outcome')
  , on              = outcome(function(err) { exit(err) })
  , Firelease       = require('firelease')
  , Firestore       = require('./src/firestore')
  , CeoLog          = require('./src/ceo-log')
  , config          = convar('ceo') || '{}'
;



function getServiceId(dias, callback) {
  try {
    var idPack = {
      'i':  999,  // who: unique id. service:box_ident_or_serial#:box_process#
      a:    convar.package.name + '/' + convar.package.version, // who: instance of: service/version
      on:   convar('box') || dias.serial, // how: box identification
      dc:   (dias.aws) ? dias.aws.zone : (dias.appfog) ? dias.appfog.center : undefined, // where: data center
      at:   undefined, // where: [city, [region ]]country or geohash?
      ll:   undefined, // where: longitude/latitude
      of:   undefined, // who: member of
      to:   undefined, // reserved
      by:   undefined, // who: stakeholder
      is:   undefined, // reserved
      it:   undefined, // reserved
      as:   undefined, // how: language/channel/protocol(s)
      cmd:  undefined, // what: unknown
      ttl:  undefined, // when: expected time to live
      via:  undefined, // how:  channel/protocol
      /*
      who:   i: unique id, a: stakeholder class(es), by: event/action-requestor, to: event/action-reply
      what:  message: log-message, cmd: command-request, it: command-handle
      where: at: city/region/country, ll: longitude/latitude
      when:  ??: timestamp, ttl: time-to-live
      why:   ad: advertisement, level: log-level, motive: code
      how:   on: device, via: channel/protocol, as: language?
      */
      env:  convar.isProduction() ? 'prod' : convar.node_env, // release stage: dev, stage, canary, prod
      paas: (dias.os == 'OSX') ? undefined : dias.paas, // host service provider
      os:   dias.os + '/' + dias.version, // host operating system
      glot: 'node/' + dias.node, // polyglot, ie application language
    }

    // firebase doesn't like '.' in keys
    idPack.i = firebaseSafeKey(convar.package.name + ':' + dias.serial + ':' + process.pid)
  } catch (err) {
    callback(err)
  }
  callback(null, idPack)
}



function initFirebase(servicePack, callback) {
  var firebase  = new Firebase(firebaseConfig.url)
    , authToken = firebaseConfig.token
  ;
  if (firebaseConfig.token) {
    var tokenGenerator = new TokenGenerator(firebaseConfig.token)
      , authToken      = tokenGenerator.createToken({
          uid:   servicePack.i, // unique id
          is:    servicePack.name + '/' + servicePack.version // enables firebase auth based on service and/or version
        })
    ;
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



function CEO(callback) {
  var ceo = this
  , firebase
  try {
    Dias({uanode: true}, function(dias) {
      getServiceId(dias, on.success(function(servicePack) {
        var logger = new CeoLog(servicePack, true /* force JSON */)
        exit.init(logger)
        ceo.about = servicePack
        ceo.log   = logger
        ceo.exit  = exit

        function multiStore(ref, area, key, callback) {
          getKeyValueStore(ref, key, on.success(function(store) { ceo[area] = store }))
        }

        initFirebase(servicePack, on.success(function(ref) {
          firebase = ref
          var uid   = servicePack.i.split(':')
          var setup = [
            { area: 'public',  key: '_' },
            { area: 'global',  key: '~' }, // all services
            { area: 'kv',      key: '~/' + servicePack.name }, // service scope
            { area: 'private', key: '?/' + servicePack.name + '/' + uid[1] + ':' + uid[2]  },
          ]
          for (var i = 0; i < setup.length; i++) {
            multiStore(ref, setup[i].area, setup[i].key, function() {})
          }
          if (!convar('DEBUG')) process.on('uncaughtException', function(err) { exit(err) })
          callback(null, ceo)
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

module.exports = CEO
