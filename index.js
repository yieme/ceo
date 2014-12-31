"use strict";

var scope          = this
  , Firebase       = require('firebase')
  , Fireproof      = require('fireproof')                // casetext/fireproof. basic firebase promises
  , TokenGenerator = require("firebase-token-generator")
  , envar          = require('envar')                    // alexindigo/node-envar. envar.prefix('my_app_'). envar.defaults({})
  , Dias           = require('dias')                     // angleman/dias. Detect PaaS details
  , _              = require('lodash')
  , bunyan         = require('bunyan')
  , mergeArray     = _.partialRight(_.assign, function(a, b) { return typeof a == 'undefined' ? b : a; })
  , appPack        = require('./package.json')
  , isProduction   = envar('NODE_ENV') == 'production' && !envar('DEBUG')
  , noop           = function(){}
  , defaults       = {
      firebase:  envar('firebase') && JSON.parse(envar('firebase')) || {},
      package:   envar('package')  && JSON.parse(envar('package'))  || appPack,
      logger:    envar('logger')   && JSON.parse(envar('logger'))   || {},
    }
  , logger         = {}
  , config         = {}
  , tokenGenerator
  , TOKEN_TTL      = 60 * 60 * 24 * 365 * 100 // ~100 years
  , firebaseRef
  , orchestratrRef = []
  , refs           = ['_', 'kv', 'pub', 'say', 'service', 'use', 'config']
;

function initRefs(callback) {
  refs.forEach(function(ref) {
    orchestratrRef[ref] = firebaseRef.child(ref)
  })
  logger.info('init')
  callback()
}

function init(options, callback) {
  if (typeof options == 'function') {
    callback = options
    options = {}
  }
  options = options || {}
  config  = mergeArray(options, defaults)
  Dias({uanode: true}, function(dias) {
    var logOptions = mergeArray(config.logger, {
      name:  config.package.name,
      ver:   config.package.version,
      level: (isProduction) ? 'info' : 'debug',
      paas: (dias.os == 'OSX') ? undefined : dias.paas,
      zone: (dias.aws) ? dias.aws.zone : (dias.appfog) ? dias.appfog.center : (dias.os == 'OSX') ? 'local' : undefined
    })
    if (envar('DEBUG')) {
      logOptions = mergeArray(logOptions, {
        src:  true,
        os:   dias.os + '/' + dias.version,
        sn:   dias.serial,
        code: 'node/' + dias.node,
      })
    }
    if (logOptions.logEntries) {
      logOptions.stream     = require('bunyan-logentries').createStream({token: logOptions.logEntries})
      logOptions.logEntries = undefined
    }

    logger           = bunyan.createLogger(logOptions)
    if (!config.firebase || !config.firebase.url) throw new Error('Missing orchestratr firebase url')
    firebaseRef      = new Firebase(config.firebase.url)
    if (config.firebase.secret) {
      tokenGenerator = new TokenGenerator(config.firebase.secret)
      AUTH_TOKEN     = tokenGenerator.createToken({uid: config.package.name + '.' + dias.serial + '.' + dias.uid, is: config.package.name + '/' + config.package.version, admin:true, exp: TOKEN_TTL})
      firebaseRef.authWithCustomToken(AUTH_TOKEN, function(error, authData) {
        if (error) {
          throw new Error('Failed orchestratr firebase token')
        } else {
          initRefs(callback)
        }
      });
    } else {
      initRefs(callback)
    }
  })
}


function _get(key, callback) { // get orchestratr.kv key/value
  orchestratrRef.kv.once(key, callback, function (err) {
    if (err) throw err
  })
}


function get(key, callback) { // get orchestratr.kv key/value
  _get(key, function (dataSnapshot) {
    callback(dataSnapshot.val())
  })
}
function put(key, value) { // set orchestratr.kv key/value
  _get(key, function (dataSnapshot) {
    dataSnapshot.set(value, function (err) {
      if (err) throw err
    })
  })
}

function remove(key) { // clear orchestratr.kv key/value
  _get(key, function (dataSnapshot) {
    dataSnapshot.remove(function (err) {
      if (err) throw err
    })
  })
}

function pub(msg, callback) { // publish an orchestratr.pub message
}
function sub(key, callback) { // subscribe to orchestratr.pub messages
}
function unsub(key, callback) { // stop subscription to orchestratr.pub messages
}


function discover(service, callback) { // discover service in orchestratr.service
}
function health(status) { // standard health update
}
function say(status, callback) { // say service status to orchestratr.say
}
function use(status, callback) { // service  to orchestratr.say
}

function fail(err) {
  logger.fatal(err)
  process.exit(500)
}

function terminate(msg) {
  logger.info(msg)
  process.exit(0)
}

process.on('uncaughtException', function(err) {
  fail(err)
})

module.exports.init     = init

module.exports.get      = get
module.exports.put      = put;
module.exports.remove   = remove;

module.exports.pub      = pub;
module.exports.sub      = sub;
module.exports.unsub    = unsub;

module.exports.discover = discover;
module.exports.health   = health;
module.exports.say      = say;
module.exports.use      = use;

module.exports.debug    = logger.debug;
module.exports.info     = logger.info;
module.exports.warn     = logger.warn;
module.exports.error    = logger.error;
module.exports.fatal    = logger.fatal;


init(function() {
  terminate('done')
});
