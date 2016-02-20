process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)


//var lawgs = require('lawgs')
//var logger  = lawgs.getOrCreate('dynamodb-error')
//logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
console.log("DYNAMOERR client_log()", operation, payload, error )	
})

exports.handler = function( event, context ) {
	DynamoDB
		.table('client_log')
		.insert_or_replace(event, function( err ) {
			if ( err ) {
				console.log(event)
				return context.done(err)
			}
			context.done()
		})
}

