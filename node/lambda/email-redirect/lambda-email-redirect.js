process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
$stats = require("node-stats")($credentials).Stats
//var UAParser = require('ua-parser-js')
//var parser = new UAParser()





exports.handler = function( event, context ) {
	var $tasks = 0


	$tasks++
	DynamoDB
		.table('clients')
		.where('site').eq( event.site )
		.where('session').eq( event.session )
		.consistentRead()
		.get(function( err, data ) {
			if (Object.keys(data).length) {
				// update
				if (!data.hasOwnProperty('progress')) {
					data.progress = {}
				}
				if (!data.progress.hasOwnProperty('recovered'))
					data.progress.recovered = 0
					
				data.progress.recovered++

				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.update({
						progress: data.progress
					} , function( err, data ) {
						if (err) {
							console.log("client.progress.recovered update failed")
						} else {
							console.log('client.progress.recovered updated')
						}
						$tasks--
					})
			} else {
				// insert
				$tasks--
			}
		})
	
	setInterval(function() {
		if ($tasks <= 0)
			context.done()
	},50)
}

