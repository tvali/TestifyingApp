var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

var async = require('async')
var lambda = require('lib/lambda')

exports.handler = function( event, context ) {

	var $date = new Date().toISOString().substr(0,10)
	if (event.hasOwnProperty('date'))
		$date = event.date 
	console.log("Process for date:" + $date);
	DynamoDB
		.table('sites')
		.index('byCrm')
		.where('crm_enabled').eq('1')
		.query(function(err, data) {
			if (err)
				return context.done(err)
			
			var $timeout = 1;
			async.each(data, function($item, cb ) {
				setTimeout(function() {
					console.log($item)
					lambda.client.invoke({
						FunctionName: 'keptify-task-crm-contacts-individual',
						InvocationType: 'Event',
						Payload : JSON.stringify({
							site: $item.hash,
							date: $date,
							tenant: $item.crm.tenant
						})
					}, function( err, data ) {
						if (err)
							cb(err)
						
						cb()
					})
				}, $timeout )
				$timeout+= 300;
				console.log("Timeout:" + $timeout);
			}, function(err) {
				if (err)
					return context.done(err)

				console.log("reached end")
				console.log("Timeout final:" + $timeout);
				console.log("Processed for date:" + $date);
				context.done()
			})
		}) 

}