var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var validator = require('validator')

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
var $tasks = 0		

DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('task-fixedplan-revenue', { operation: operation, payload: payload, error: error })
})

	

exports.handler = function( event, context ) {
	$tasks++
	(function( $lastKey ) {
		var $sites = []
		var self = arguments.callee
		DynamoDB
			.table('sites')
			.select('hash','affiliate_name','affiliate_plan_price','company_name')
			.filter('affiliate_name').eq('plan')
			.resume($lastKey)
			.scan(function( err, data ) {
				// handle error, process data ...
				if (err) {
					console.log("failed getting sites")
					$tasks--
					return getSites(false)
				}
				
				for (var i in data)
					$sites.push(data[i])
			
				if (this.LastEvaluatedKey === null) {
					// reached end, do a callback() maybe
					$tasks--
					return getSites($sites)
				} 

				var $this = this
				setTimeout(function() {
					$tasks--
					self($this.LastEvaluatedKey)
				},1000)
			})
	})(null) 

	function getSites($sites) {
		if ($sites === false)
			return context.done({error: 'could not get sites'})
		
		// for each site replace into revenue ...
		for (var i in $sites) {
			$tasks++
			DynamoDB
				.table('revenue')
				.insert_or_replace({
					network: 'self',
					order_id: 'plan-' + (new Date().toISOString().substr(0,7) ) + '-' + $sites[i].hash,
					amount: 0,
					commission: parseInt($sites[i].affiliate_plan_price),
					//ip: event.client.ip,
					month: (new Date().toISOString().substr(0,7) ), 
					date: (new Date().toISOString().substr(0,7) ) + '-01',
					site: $sites[i].hash,
					status: 'VALID'
				}, function( err, data ) {
					if (err)
						console.log("failed inserting into admin revenue")
					else
						console.log("inserted into admin revenue")

					$tasks--
				})
		}
		
		
	}


	setInterval(function() {
		if ($tasks <= 0)
			context.done()
	},50)
}