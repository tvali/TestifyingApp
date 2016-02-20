process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var $stats = require("node-stats")($credentials).Stats
var validator = require('validator')
var request = require('request')

var async = require('async')
var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	console.log({ operation: operation, payload: payload, error: error })
	logger.log('email-view', { operation: operation, payload: payload, error: error })
})

var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
	credentials: {
		accessKeyId: "AKIAJQ4VVBL5RZOGD6IA", 
		secretAccessKey: "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", 
	},
	region: "eu-west-1"	
})

exports.handler = function( event, context ) {
	console.log(event)
	DynamoDB
		.table('emails')
		.where('site').eq( event.site )
		.where('timestamp').eq( parseInt(event.ame) )
		.consistentRead()
		.get(function( err, email_sent ) {
			// viewed
			if (err)
				return context.done(err)
			
			if ( !Object.keys( email_sent ).length )
				return context.done("empty record in emails")
			
			console.log("email", email_sent )

			if (email_sent.hasOwnProperty('viewed')) {
				console.log("already market as viewed")
				return context.done()
				
				// @todo: mark view anyway in a list
			}
			
			// mark as view and insert into stats
			DynamoDB
				.table('emails')
				.where('site').eq( event.site )
				.where('timestamp').eq( parseInt(event.ame) )
				.update({
					viewed: event.enhanced_time
				}, function( err, data ) {
					if (err)
						return context.done(err)

					console.log("updated emails.viewed")

					var	$stat = {
						e_v: 1,
					}
					async.parallel([
							function(callback){
								$stats.inc('ROOT', 'DAY', $stat, function(err) {
									if (err) 
										console.log("ROOT DAY inc failed", err)
									else
										console.log("ROOT DAY inc")
								
									callback(null)
								} )
							},
							function(callback){
								$stats.inc('ROOT', 'HOUR', $stat, function(err) {
									if (err) 
										console.log("ROOT HOUR inc failed", err)
									else
										console.log("ROOT HOUR inc")
								
									callback(null)
								} )
							},
							function(callback){
								$stats.inc( event.site, 'DAY', $stat, function(err) {
									if (err) 
										console.log(event.site, " DAY inc failed", err)
									else
										console.log(event.site, " DAY inc")
								
									callback(null)
								} )
							},
							function(callback){
								$stats.inc( event.site, 'HOUR', $stat, function(err) {
									if (err) 
										console.log(event.site, " HOUR inc failed", err)
									else
										console.log(event.site, " HOUR inc")
								
									callback(null)
								} )
							},
							function(callback) {
								// add to log
								DynamoDB
									.table('client_log')
									.insert_or_replace({
										client: event.site + ' ' + email_sent.session,
										timestamp: event.enhanced_time,
										type: 'email_view',
								//		ip: event.client.ip,
									}, function( err, data ) {
										if (err) {
											console.log("+client_log failed", err )
										} else {
											console.log("+client_log OK")
										}
										callback(null)
									})
								
							}
						],
						function(err, result){
							context.done()
						}
					)
					
				})
		})
}