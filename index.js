;(function() {
  'use strict';

  var convar          = require('convar')
//    , newrelic        = (convar('newrelic')) ? require('newrelic') : false
//    , logger          = { info: console.log, warn: console.log, error: console.log, fatal: console.log }
    , FirebaseInit    = require('firebase-init')
    , Dias            = require('dias')                    // angleman/dias. Detect PaaS details
    , exit            = require('./src/service-exit')
    , firebaseSafeKey = require('./src/firebase-safe-key')
    , outcome         = require('outcome')
    , on              = outcome(function(err) { exit(err) })
//    , Firelease       = require('firelease')
    , Firestore       = require('./src/firestore')
    , CeoLog          = require('./src/ceo-log')
    , ips             = require('ips')
    , Statpack        = require('statpack')
    , ceoId           = null
    , aliveHandle     = null
    , aliveRef        = null
    , myIps           = ips(function(err, data) { if (!err) myIps = data })
//    , config          = convar('ceo') || '{}'
  ;


  function getServiceId(dias, callback) {
    var idPack = {}
    try {
      idPack = {
        'id':  999,  // who: unique id. service:box_ident_or_serial#:box_process#
        app:  convar.package.name + '/' + convar.package.version, // who: instance of: service/version
        on:   convar('nodename') || dias.serial, // how: box identification
        dc:   (dias.aws) ? dias.aws.zone : (dias.appfog) ? dias.appfog.center : undefined, // where: data center
        //at:   undefined, // where: [city, [region ]]country or geohash?
        //ll:   undefined, // where: longitude/latitude
        //of:   undefined, // who: member of
        //to:   undefined, // reserved
        //by:   undefined, // who: stakeholder
        //is:   undefined, // reserved
        //it:   undefined, // reserved
        //as:   undefined, // how: language/channel/protocol(s)
        //cmd:  undefined, // what: unknown
        //ttl:  undefined, // when: expected time to live
        //via:  undefined, // how:  channel/protocol
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
      var dc = (idPack.dc) ? idPack.dc + '-' : ''
      idPack.id = firebaseSafeKey(convar.package.name + ':' + dc + idPack.on + ':' + process.pid)
    } catch (err) {
      callback(err)
    }
    callback(null, idPack)
  }



  function getKeyValueStore(firebaseRef, path, callback) {
    new Firestore({ ref: firebaseRef, child: path }, on.success(function(store) {
      callback(null, store)
    }))
  }



  function CEO(callback) {
    var ceo = {}
      , firebaseRef
      , statpack
    try {
      Dias({uanode: true}, function(dias) {
        getServiceId(dias, on.success(function(servicePack) {
          var logger = new CeoLog(servicePack, true /* force JSON */)
          exit.init(logger)
          ceo.about = servicePack
          ceo.log   = logger
          ceo.exit  = exit

          function alive() {
            statpack.addStats()
            aliveRef.update({
              ping: FirebaseInit.ServerValue.TIMESTAMP,
              stat: statpack.getStats()
            })
          }

          function addToDiscovery() {
            console.log('addToDiscover()')
            if (ceoId) return false
            var json        = JSON.stringify(ceo.about)
              , service     = JSON.parse(json)

//            console.log('json:', json)
            var discovery = firebaseRef.child('discovery').ref()
//            console.log('discovery:', discovery.toString())
            aliveRef     = discovery.push().ref()

            service.ips     = myIps
            service.key     = aliveRef.key()
            ceoId           = service.key.toString()
            service.added   = FirebaseInit.ServerValue.TIMESTAMP

            aliveRef.onDisconnect().remove()

            console.log(aliveRef.toString())
            console.log(service)
            aliveRef.set(service)

            aliveHandle = setInterval(alive, 1000)

            return ceoId
          }
          statpack              = new Statpack(function() { return FirebaseInit.ServerValue.TIMESTAMP })
          ceo.discovery         = {}
          ceo.discovery.add     = addToDiscovery
          ceo.discovery.beginOp = statpack.beginOp
          ceo.discovery.endOp   = statpack.endOp

          function removeFromDiscovery() {
            if (!ceoId) return false
            clearTimeout(aliveHandle)
            aliveHandle = null
            return true
          }

          ceo.discovery.remove = removeFromDiscovery

          function multiStore(ref, area, key, callback) {
            getKeyValueStore(ref, key, on.success(function(store) {
              ceo[area] = store
              if (callback) callback(store)
            }))
          }

          var custom = {
            uid: servicePack.id,                              // unique id
            is:  servicePack.name + '/' + servicePack.version // enables firebase auth based on service
          }
          FirebaseInit({custom: custom}, on.success(function(ref) {
            firebaseRef = ref
            var uid     = servicePack.id.split(':')
            var setup   = [
              { area: 'public',  key: '_' },
              { area: 'global',  key: '~' }, // all services
              { area: 'kv',      key: '~/' + servicePack.name }, // service scope
              { area: 'private', key: '?/' + servicePack.name + '/' + uid[1] + ':' + uid[2]  },
            ]
            for (var i = 0; i < setup.length; i++) {
              multiStore(ref, setup[i].area, setup[i].key, function() {}) // TODO: add auto removal of private kv store
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

  module.exports = CEO // support CommonJS
// if (typeof exports === 'object') module.exports = CEO // support CommonJS
// else if (typeof define === 'function' && define.amd) define(function() { return Test }) // support AMD
// else this.Test = Test // support browser
}());

/*

security rules:

{
  "rules": { // no access by default, the linux way
      ".read":  true,
      ".write": true,
    "_": { // public readonly service exposure, children are usually named after the updating service
      ".read": true,
      ".write": "(auth.admin == true)"
    },
    "|": { // global firehoses, service to service messaging
      ".read":  "(auth.admin == true)",
      ".write": "(auth.admin == true)",
      "$service": { // service specific firehoses
        ".read":  "(auth.admin == true)",
        ".write": "(auth.admin == true) && (auth.name == '$service')"
      }
    },
    "~": { // global key/value store
      ".read":  true,
      ".write": true,
      "$service": { // service specific key/value stores
        ".read":  "(auth.admin == true)",
        ".write": "(auth.admin == true)"
      }
    },
    "?": { // private process specific key/value stores
      ".read":  "(auth.admin == true)",
      ".write": "(auth.admin == true)",
      "$process": {
        ".read":  "(auth.admin == true) && (auth.uid == '$process')",
        ".write": "(auth.admin == true) && (auth.uid == '$process')"
      }
    },
    "µs": { // service discovery and status, services register status
      ".read":  "(auth.admin == true)",
      ".write": "(auth.admin == true)"
    },
    "people": {
      ".read":  "(auth.isModerator == true)",
      ".write": "(auth.isModerator == true)"
    }
  }
}

*/
