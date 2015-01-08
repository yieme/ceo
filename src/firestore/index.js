"use strict";
var _                      = require('lodash')
  , Firebase               = require('firebase')
  , FirebaseTokenGenerator = require('firebase-token-generator')

function Firestore(options, callback) { // TODO: co upgrade
  if(!_.isFunction(callback)) {
    return _.partial(Firestore, options)
  }

  var firestore = this
  function complete() {
    callback(null, firestore)
  }

  options = options || {}
  var Ref = options.ref || (options.url && new Firebase(options.url)) || false
  if (!Ref) {
    callback(new Error("Firestore: ref or url required"))
    return
  }

  if (options.child) {
    Ref = Ref.child(options.child)
  } else {
    var path = '/' + Ref.toString().split('.com/')[1]
    Ref = Ref.root().child(path)  // generate new firebase reference
  }

  firestore.get = function (key, callback) { // get key value
    if(!_.isFunction(callback)) {
      return _.partial(Firestore.get, key)
    }

    var ref = Ref.child(key)
    ref.once('value', function (snap) {
      var val = snap.val()
      callback(null, val)
    }, callback);
  }



  firestore.set = function (key, value, callback) { // set key/value
    if(!_.isFunction(callback)) {
      return _.partial(Firestore.set, key, value)
    }

    Ref.child(key).set(value, callback);
  }



  firestore.del = function (key, callback) { // clear key
    if(!_.isFunction(callback)) {
      return _.partial(Firestore.del, key)
    }

    Ref.child(key).remove(callback);
  }



  if (options.token) {
    var token      = options.token
    if (options.auth) {
      var tokenGen = new FirebaseTokenGenerator(options.token)
      token        = tokenGen.createToken(options.auth)
    }
    try {
      Ref.authWithCustomToken(token, complete)
    } catch (err) { callback(err) }
  } else {
    complete()
  }
}



module.exports = Firestore
