var api = require('lib/website-api')

exports.handler = function (event, context) {
	if (typeof api[event.method] === "function") {
		event.params.session = event.session
		api[event.method](event.params, function( err, data ) {
			if (err)
				context.succeed({errorMessage: err})
			else
				context.succeed({data: data})
		} )
	} else {
		context.succeed({errorMessage: 'no such method'})
	}
}