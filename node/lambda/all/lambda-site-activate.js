process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
exports.handler = function( event, context ) {
	console.log(event.site)
	DynamoDB
		.table('sites')
		.where('hash').eq(event.site)
		.update({last_load: new Date().getTime() }, function( err ) {
			if (err)
				return context.done(err)

			context.done()
		})
}