"use strict";

var logger         = {
      info:  console.log,
      fatal: console.log
    }
  , exitMessage    = 'exit'
  , isExiting      = false
//  , drainAndExit   = require('exit') // cowboy/node-exit


function serviceExit(finalMessage) {
  if (isExiting) {
    console.log(finalMessage)
    process.exit(500) // error during shutdown so halt
  }
  isExiting    = true
  finalMessage = finalMessage || exitMessage
  var isError  = (finalMessage instanceof Error)
  if (isError) {
    logger.fatal(finalMessage)
  } else {
    logger.info(finalMessage)
  }
  setTimeout( process.exit((isError) ? 500 : 0), 1000) // allow logger to finish
}



serviceExit.init = function (aLogger, finalMessage) {
  logger      = aLogger      || logger
  exitMessage = finalMessage || exitMessage
}

module.exports = serviceExit
