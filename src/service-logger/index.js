var envar        = require('envar')                    // alexindigo/node-envar. envar.prefix('my_app_'). envar.defaults({})
  , bunyan       = require('bunyan')                   // trentm/node-bunyan JSON logging
  , mergeObjects = require('../merge-objects')
  , env          = (envar('NODE_ENV')) ? envar('NODE_ENV') : 'development'



function initLogger(config, id) {
  var logOptions = mergeObjects(config.logger, id)
  var logentries = logOptions.logEntries || envar('LOGENTRIES')
  if (logentries) {
    logOptions.stream     = require('bunyan-logentries').createStream({token: logentries.logEntries})
    logOptions.logEntries = undefined
  }
  if (typeof logOptions.src == 'undefined' && (env == 'development' || envar('DEBUG'))) {
    logOptions.src = true
  }

  return bunyan.createLogger(logOptions)
}

module.exports = initLogger
