// firebase key/value store
// todo:
// - cache key snapshots
// - add TTL

"use strict";

function Firestore(ref) {
  var Ref = ref

  function get(key, callback) { // get orchestratr.kv key/value
    Ref.once(key).then(function(snap) {
      var val = snap.val()
      callback(val)
    })
  }

  function put(key, value) { // set orchestratr.kv key/value
    console.log('put:', key, value)
    Ref.once(key).then(function(snap) {
      console.log('snap:', snap, key, value)
      snap.set(value, function (err) {
        if (err) throw err
      })
    })
  }

  function del(key) { // clear orchestratr.kv key/value
    _get(key, function (dataSnapshot) {
      dataSnapshot.remove(function (err) {
        if (err) throw err
      })
    })
  }

  var firestore = {
    get: get,
    put: put,
    del: del
  }
  return firestore
}


module.exports = Firestore
