"use strict";

var envar      = require('envar')                    // alexindigo/node-envar. envar.prefix('my_app_'). envar.defaults({})
  , toType     = function(obj) {
      return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    }
  , _          = require('lodash')



function getvar(name, requiredMessage, exitCode, logger) {
  var val = envar(name)
  if (requiredMessage && typeof val === 'undefined') {
    var type = toType(requiredMessage)
    if ('string' !== type && 'error' !== type) {
      requiredMessage = name + ' required via default, config, environment variable, package, npm or cli'
    }
    if (exitCode) {
      logger = logger || console.log
      logger(requiredMessage)
      process.exit(exitCode)
    } else {
      if (logger) logger(requiredMessage)
      if ('error' != type) requiredMessage = new Error(requiredMessage)
      throw requiredMessage
    }
  }
  if ('string' === typeof val) {
    try {
      var json = JSON.parse(val)
      val      = json
    } catch(e) { }
  }
  return val
}

getvar.package = _.cloneDeep(envar.import('package.json')) // default config details from package.json
envar.import({})



// envar pass-thru
getvar.import   = envar.import
getvar.defaults = envar.defaults
getvar.prefix   = envar.prefix
getvar.order    = envar.order
getvar.npm      = envar.npm
getvar.node_env = function() {
  var env = envar('NODE_ENV') || 'dev'
  env     = env.toLowerCase()
  if (env.substr(0,3) === 'dev')  env = env.substr(0,3)
  if (env.substr(0,4) === 'prod') env = env.substr(0,4)
  return env
}
getvar.isProduction = function() {
  return 'prod' === this.node_env.substr(0,4)
}
getvar.isDevelopment = function() {
  return 'dev' === this.node_env.substr(0,3)
}
getvar.isStage = function() {
  return 'stage' === this.node_env.substr(0,5)
}
getvar.isCanary = function() {
  return 'canary' === this.node_env.substr(0,6)
}

module.exports  = getvar
