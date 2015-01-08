"use strict";

var getvar           = require('../getvar')                    // alexindigo/node-getvar. getvar.prefix('my_app_'). getvar.defaults({})
  , env              = getvar('NODE_ENV') || 'development'
  , Winston          = require('winston')
;



function ServiceLogger(meta) {
  var serviceLogger = this
  var metaData      = meta

  var transports = [
    new Winston.transports.Console({ handleExceptions: true, json: true })
  ]

  var config     = getvar('logger')  || {}
    , LogEntries = config.logentries || getvar('LOGENTRIES')
    , Loggly     = config.loggly     || getvar('LOGLY')
    , Riak       = config.riak       || getvar('RIAK')
    , MongoDB    = config.mongodb    || getvar('MONGODB')
    , SimpleDB   = config.simpledb   || getvar('SIMPLEDB')

  if (LogEntries) add(require('winston-logentries-transport').Logentries, LogEntries)
  if (Loggly)     add(require('winston-loggly').Loggly,     Loggly)
  if (Riak)       add(require('winston-riak').Riak,         Riak)
  if (MongoDB)    add(require('winston-mongodb').MongoDB,   MongoDB)
  if (SimpleDB)   add(require('winston-simpledb').SimpleDB, SimpleDB)

  var winston = new Winston.Logger({
    transports:  transports,
    exitOnError: false
  })

  function add(logr, options) {
    options.json = true
    var Logr = new logr(options)
    transports.push(Logr)
  }

  serviceLogger.debug   = function(message) { winston.debug(message, metaData) }
  serviceLogger.verbose = function(message) { winston.verbose(message, metaData) }
  serviceLogger.info    = function(message) { winston.info(message, metaData) }
  serviceLogger.warn    = function(message) { winston.warn(message, metaData) }
  serviceLogger.error   = function(message) { winston.error(message, metaData) }

  return serviceLogger
}



module.exports = ServiceLogger
