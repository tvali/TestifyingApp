




exports.handler = function( event, context ) {
  // event.sites[i] = hash
  var bar = require("./lib/api-gateway/" + event.method )
  bar(event, context)
}
