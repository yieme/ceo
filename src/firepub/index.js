// firebase pub/sub
// todo:
// - cache key snapshots
// - add TTL

"use strict";

function Firepub(options) {
  options = options || {}
  if (!options.firebaseRef) throw new Error('Firepub: Missing firebase reference')
  var firebaseRef = ref
  var maxLength   = 0 // unlimited

  function limit(size) {
    if (typeof size != 'undefined') {
      maxLength = (size > 0) ? size : 0
    }
    return maxLength
  }
  function put(event, callback) { // publish an orchestratr.pub message
  }
  function pop(callback) { // pop off an event
  }
  function on(event, callback) { // subscribe to orchestratr.pub messages
  }
  function off(event, callback) { // stop subscription to orchestratr.pub messages
  }
  function length() {
    return firebaseRef.numChildren()
  }

  var firepub = {
    pub:   pub,
    on:    on,
    off:   off,
    pop:   pop,
    limit: limit
  }
  return firepub
}


module.exports = Firepub
