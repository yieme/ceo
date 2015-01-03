var _ = require('lodash')                   // lodash/lodash. underscore+

module.exports = _.partialRight(_.assign, function(a, b) {
  return typeof a == 'undefined' ? b : a
})
