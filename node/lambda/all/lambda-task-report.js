

var async = require('async')

var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
    accessKeyId: "AKIAJQ4VVBL5RZOGD6IA", 
    secretAccessKey: "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", 
    region: "eu-west-1"	
})

var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

/*
var validator = require('validator')

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
var $tasks = 0		

DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('task-report', { operation: operation, payload: payload, error: error })
})


*/


exports.handler = function( event, context ) {
	async.waterfall([
		function( callback ) {
			(function( $lastKey ) {
				var $sites = []
				var self = arguments.callee
				DynamoDB
					.table('sites')
					.select('hash','company_name', 'email', 'server', 'company_url')
					.filter('report_enabled').eq(1)
					.resume($lastKey)
					.scan(function( err, data ) {
						// handle error, process data ...
						if (err) {
							console.log("failed getting sites")
							$tasks--
							return callback({error: 'could not get sites'})
						}
						
						for (var i in data)
							$sites.push(data[i])
					
						if (this.LastEvaluatedKey === null) {
							// reached end, do a callback() maybe
							
							return callback(null,$sites)
							$tasks--
						} 

						var $this = this
						setTimeout(function() {
							
							self($this.LastEvaluatedKey)
						},1000)
					})
			})(null) 

		},
		function ( $sites, callback ) {
			console.log("got into 2nd waterfall, sites=", $sites.length)

			
			
			
		// get the template
		DynamoDB
			.table('campaigns')
			.where('site').eq('ROOT')
			.where('id').eq(72)
			.get(function( err, data ) {
				if ( err )
					return callback({error: 'could not fetch mail template'})

				var $email = data.emails[ data.id ]

				// for each site replace into revenue ...
				
				var $kv_sites = {}
				for (var i in $sites) {
					$kv_sites[$sites[i].hash] = $sites[i]
				}
				
				var $reports_to_send = Object.keys($kv_sites).length
				$max_time = 30000 // max is 60 but some were already consumed by the sites scan
				$min_time = Math.round($max_time / $reports_to_send)
				if ($min_time > 2000 ) $min_time = 2000
				
				setInterval(function() {
					if (Object.keys($kv_sites).length === 0) {
						console.log("reached end")
						return callback(null)
					}
					
					// remove one item from object
					console.log("processing", Object.keys($kv_sites)[0], $kv_sites[Object.keys($kv_sites)[0]], Object.keys($kv_sites).length - 1, "left" )
					$lambda.invokeAsync({
						FunctionName: 'keptify-task-report-individual',
						//InvocationType: 'Event',
						InvokeArgs : JSON.stringify({
							site: $kv_sites[Object.keys($kv_sites)[0]],
							email: $email
						})
					}, function( err, data ) {
						if (err)
							callback(err)
					})			
					
					delete $kv_sites[Object.keys($kv_sites)[0]]		
				}, $min_time )
			})			
		}
	],function(err, result) {
		if (err)
			return context.done( err )
		
		setTimeout(function() {
			context.done()
		},1000)
		
	})
	/*
	$tasks++

	function getSites($sites) {




	*/

	//setInterval(function() {
	//	if ($tasks <= 0)
			
	//},50)
}