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
var async = require('async')
var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	console.log({ operation: operation, payload: payload, error: error })
	logger.log('email-redirect', { operation: operation, payload: payload, error: error })
})



exports.handler = function( event, context ) {
	console.log("event=",event)

	DynamoDB
		.table('emails')
		.where('site').eq( event.site )
		.where('timestamp').eq( parseInt(event.ame) )
		.consistentRead()
		.get(function( err, email_sent ) {

			if (err)
				return context.done(err)
			
			if ( !Object.keys( email_sent ).length )
				return context.done("empty record in emails")
			
			console.log("email", email_sent )

			// @todo: mark click anyway in a list
			var $stat = { }

			if (!email_sent.hasOwnProperty('viewed'))
				$stat.e_v = 1

			if (!email_sent.hasOwnProperty('clicked'))
				$stat.e_c = 1
						
			async.parallel([
					function(callback){
						DynamoDB
							.table('client_log')
							.insert_or_replace({
								client: event.site + ' ' + email_sent.session,
								timestamp: event.enhanced_time,
								type: 'mark_recovered',
								ip: event.client.ip,
							}, function( err, data ) {
								if (err) {
									console.log("+client_log recovered failed", err )
								} else {
									console.log("+client_log recovered OK")
								}
								callback(null)
							})							
					},
					function(callback){
						DynamoDB
							.table('client_log')
							.insert_or_replace({
									client: event.site + ' ' + email_sent.session,
									timestamp: event.enhanced_time_start,
									type: 'email_click',
									ip: event.client.ip,
									
									b_n : event.client.browser,
									b_v : event.client.browser_version,
									os_n : event.client.os,
									os_v : event.client.os_version,
									//dev_n : array('S' => empty($ua->device->family) ? '(empty)' : $ua->device->family ),

							}, function( err, data ) {
								if (err) {
									console.log("+client_log click failed", err )
								} else {
									console.log("+client_log click OK")
								}
								callback(null)
							})	
					},
					function(callback){
							if (!Object.keys($stat).length) {
								console.log("ROOT DAY skip")
								callback(null)
							} else {
								$stats.inc('ROOT', 'DAY', $stat, function(err) {
									if (err) 
										console.log("ROOT DAY inc failed")
									else
										console.log("ROOT DAY inc")
									
									callback(null)
								} )
							}
					},
					function(callback){
							if (!Object.keys($stat).length) {
								console.log("ROOT HOUR skip")
								callback(null)
							} else {
								$stats.inc('ROOT', 'HOUR', $stat, function(err) {
									if (err) 
										console.log("ROOT HOUR inc failed")
									else
										console.log("ROOT HOUR inc")

									callback(null)
								} )
							}
					},
					function(callback){
							if (!Object.keys($stat).length) {
								console.log(event.site, " DAY skip")
								callback(null)
							} else {
								$stats.inc(event.site, 'DAY', $stat, function(err) {
									if (err) 
										console.log(event.site, " DAY inc failed")
									else
										console.log(event.site, " DAY inc")

									callback(null)
								} )
							}
					},
					function(callback){
							if (!Object.keys($stat).length) {
								console.log(event.site, " HOUR skip")
								callback(null)
							} else {
								$stats.inc(event.site, 'HOUR', $stat, function(err) {
									if (err) 
										console.log(event.site, " HOUR inc failed")
									else
										console.log(event.site, " HOUR inc")

									callback(null)
								} )
							}
					},					
					
					function(callback){
						// mark emails as viewed and clicked
						DynamoDB
							.table('emails')
							.where('site').eq(event.site)
							.where('timestamp').eq(parseInt(event.ame))
							.update({
								viewed: event.enhanced_time,
								clicked: event.enhanced_time
							}, function( err, data) {
								if (err)
									console.log("emails.viewed+clicked update FAILED")
								else
									console.log("emails.viewed+clicked update OK")

								callback(null)
							})
					},
					function(callback) {
						DynamoDB
							.table('clients')
							.where('site').eq( event.site )
							.where('session').eq( email_sent.session )
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
										.where('session').eq( email_sent.session )
										.update({
											progress: data.progress
										} , function( err, data ) {
											if (err) {
												console.log("client.progress.recovered update failed")
											} else {
												console.log('client.progress.recovered updated')
											}
											callback(null)
										})
								} else {
									// insert
									callback(null)
								}
							})
					}
				],
				function(err, result){
					context.done()
				}
			)

		})
}
