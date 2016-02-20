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
var lambda = require('lib/lambda')
var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('finish', { operation: operation, payload: payload, error: error })
})

exports.handler = function( event, context ) {

	var $client
	async.parallel([
		function( cb ) {
			lambda.client_log({
					client: event.site + ' ' + event.session,
					timestamp: event.enhanced_time,
					type: 'order_finish',
					ip: event.client.ip
			}, function(err) {
				if ( err )
					console.log("client_log call failed")
				else
					console.log("client_log call OK")

				cb()
			} )
		},
		function( cb ) {
			DynamoDB
				.table('clients')
				.where('site').eq( event.site )
				.where('session').eq( event.session )
				.consistentRead()
				.get(function( err, data ) {
					if (err)
						return cb( err )
				
					$client = data
					if (!Object.keys($client).length) {
						console.log("client is empty ", Object.keys($client) ,$client )
						return cb({errorMessage: 'inexistent session in clients', site: event.site, session: event.session })
					}
					cb()
				})
		}
	], function( err ) {
		if (err)
			return context.done(err)

		async.parallel([
			function( cb ) {
				if (!$client.hasOwnProperty('progress')) {
					$client.progress = {}
				}
				$client.progress.finalized = true
				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.update({
						progress: $client.progress,
						_date: event._date,
						_month: event._month
					} , function( err ) {
						if (err) {
							console.log("client.progress.finalized update failed")
							return cb(err)
						} 
						
						console.log('client.progress.finalized updated')
						cb()
					})
				
			},
			function( cb ) {
				if ($client.progress.hasOwnProperty('recovered') && $client.progress.recovered > 0) {
					console.log("order was recovered, check if need insert into revenue")

					DynamoDB
						.table('sites')
						.where('hash').eq( event.site ) 
						.get(function( err, data ) {
							if (err) {
								console.log( "check if it is self affiliate error: ", err )
								return cb(err)
							}
							
							if (data.hasOwnProperty('affiliate_name') && data.affiliate_name == 'plan') {
								console.log("on plan, inserting into revenue")
								// do not put in month, we do not want it show into admin, only for SiteDate
								
								
								async.parallel([
									function( cb2 ) {
										DynamoDB
											.table('revenue')
											.insert_or_replace({
												network: 'self',
												order_id: event.session,
												amount: event.amount,
												commission: 0,
												date: event._date,
												ip: event.client.ip,
												//month: event._month, 
												site: event.site,
												status: 'VALID'
											}, function( err ) {
												if (err)
													return cb2(err)
												
												console.log("inserted into revenue for client")
												cb2()
											})
									}, 
									function( cb2 ) {
										DynamoDB
											.table('revenue')
											.insert_or_replace({
												network: 'self',
												order_id: 'plan-' + event._month,
												amount: 0,
												commission: data.hasOwnProperty('affiliate_plan_price') ? data.affiliate_plan_price : 0,
												//date: event._date,
												//ip: event.client.ip,
												month: event._month, 
												site: event.site,
												status: 'VALID'
											}, function( err, data ) {
												if (err) {
													console.log("failed inserting into admin revenue")
													return cb2(err)
												}
												console.log("inserted into admin revenue")
												cb2()
											})
									}
								], function(err) {
									if (err)
										return cb(err)
									
									cb()
								})
							} else {
								console.log("site is not on keptify plan, skip revenue")
								cb()
							}
						})
				
				} else {
					console.log("not recovered skip inserting into revenue")
					cb()
				}
			}
		], function(err) {
			context.done()
		} )
	})
}

