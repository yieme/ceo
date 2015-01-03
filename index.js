"use strict";

var scope          = this
  , logger         = { fatal: console.log }
  , Firebase       = require('firebase')
  , TokenGenerator = require("firebase-token-generator")
  , envar          = require('envar')                    // alexindigo/node-envar. envar.prefix('my_app_'). envar.defaults({})
  , Dias           = require('dias')                     // angleman/dias. Detect PaaS details
  , mergeObjects   = require('./src/merge-objects')
  , fs             = require('fs')
  , os             = require('os')
  , appPack        = (fs.existsSync('../../package.json')) ? require('../../package.json') : require('./package.json')
//  , Fireproof      = require('fireproof')
//  , Q              = require('q')                        // kriskowal/q
  , Firelease      = require('firelease')
  , Firestore      = require('./src/firestore')
  , defaults       = {
      firebase:  envar('firebase') && JSON.parse(envar('firebase')) || {},
      package:   envar('package')  && JSON.parse(envar('package'))  || appPack,
      logger:    envar('logger')   && JSON.parse(envar('logger'))   || {},
    }
  , FIREBASE_TOKEN_TTL = 60 * 60 * 24 * 365 * 100 // ~100 years
  , fireproof
  , orchestratr  = {}
  , initLogger   = require('./src/service-logger')
  , isExiting    = false
;

// process.hrtime(time) // node up time in ns (nano). 1000ns = 1µs (micro). 1000µs = 1ms (milli). 1000ms = 1s (second)


function exit(msg) {
  if (isExiting) {
    console.log(msg)
    process.exit(500) // error during shutdown so halt
  }
  isExiting   = true
  msg         = msg || 'end'
  var isError = (msg instanceof Error)
  if (isError) {
    logger.fatal(msg)
  } else {
    logger.info(msg)
  }
  setTimeout( process.exit((isError) ? 500 : 0), 1000) // allow logger to finish
}

if (!envar('DEBUG')) process.on('uncaughtException', function(err) { exit(err) })



function serviceId(dias, config, callback) {
  config      = config || {}
  config.id   = config.id || {}
  var version = config.package.version
    , name    = config.package.name
    , id      = mergeObjects(config.id, {
    uid:  999,
    name: name,
    ver:  version,
    env:  (config.env)        ? config.env    : (envar('NODE_ENV')) ? envar('NODE_ENV')  : 'development', // dev, stage, canary, production
    paas: (dias.os == 'OSX')  ? undefined     : dias.paas,
    dc:   (dias.aws)          ? dias.aws.zone : (dias.appfog)       ? dias.appfog.center : (dias.os == 'OSX') ? 'local' : undefined,
    os:   dias.os + '/' + dias.version,
    sn:   dias.serial,
    glot: 'node/' + dias.node, // polyglot, ie application language
  })
  id.uid = id.name + '.' + dias.serial + '.' + process.pid
  orchestratr.id = id
  callback(id)
}



function initFirebase(config, callback) {
  config       = config || {}
  if (!config.firebase || !config.firebase.url) throw new Error('Orchestratr: Missing firebase url')
  var firebase = new Firebase(config.firebase.url)
//  Fireproof.bless(Q)
//  fireproof    = new Fireproof(firebase)
//  fireproof.bless(Q)
  if (config.firebase.secret) {
    var tokenGenerator = new TokenGenerator(config.firebase.secret)
      , authToken      = tokenGenerator.createToken({
      uid:   config.package.name + '.' + dias.serial + '.' + dias.uid,
      is:    config.package.name + '/' + config.package.version,
      admin: true,
      exp:   FIREBASE_TOKEN_TTL
    })
    firebase.authWithCustomToken(authToken function(err, authData) {
      if (err) throw new Error('Orchestratr: Bad firebase token')
      callback()
    })
  } else {
    callback()
  }
}



function init(config, callback) {
  if (typeof config == 'function') {
    callback = config
    config   = {}
  }
  config = config || {}
  mergeObjects(config, defaults)
  Dias({uanode: true}, function(dias) {
    serviceId(dias, config, function(id) {
      logger = initLogger(config, id) // TODO: merge dias details to config
      initFirebase(config, function() {
        logger.info('init')
        callback()
      })
    })
  })
}



function getFirebaseRefs(name, list) {
  if (!orchestratr[name]) {
    var refs = {}
    for (var i=0; i < list.length; i++) {
      var item = list[i]
      var keyRef = (item.area) ? firebase.child(item.area) : firebase
      if (item.scope) {
        refs[item.scope] = new Firestore(keyRef.child(item.ref))
      } else {
        refs = new Firestore(keyRef)
      }
    }
  }
  orchestratr[name] = refs
  return orchestratr[name]
}



module.exports.keystore = function () {
  return getFirebaseRefs('keystore', [
  {                   area: '~', key: orchestratr.id.name }, // service common key/value store. root scope must be the first entry
//  { scope: 'global',  area: '~'                           }, // all key/value store
//  { scope: 'public',             key: '_'                 }, // public facing key/value store
//  { scope: 'private', area: '?', key: orchestratr.id.uid  }  // private common key/value store
])}

module.exports.event = function () { return getFirebaseRefs('event', [
  {                   area: '|', key: '_' }, // service common key/value store. root scope must be the first entry
  { scope: 'global',  area: '|'           }, // all key/value stores
  { scope: 'public',             key: '_' }  // public facing key/value store, firehose
])}

module.exports.health   = function () { return getFirebaseRefs('health',   [ ['global', 'g'], ['service', '$service'] ]) }
module.exports.catalog  = function () { return getFirebaseRefs('catalog',  [ ['global', 'g'], ['service', '$service'], ['node', '$node'], , ['datacenter', '$datacenter'] ]) }


// lifecycle management
module.exports.init  = init
module.exports.ready = function ready(cb) {}
module.exports.exit  = exit
module.exports.log   = logger

module.exports.pin   = function pin(event_name, options) {} // creates O.event_name() && O.eventName() // options = { timeout: 0, first: 1, do: remoteService } || function(){} // do: shortcut


// O.attachWorker.service/global(key, options, worker) -> fireleaseRef
