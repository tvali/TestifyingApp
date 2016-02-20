process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
$stats = require("node-stats")($credentials).Stats

var lambda = require('lib/lambda')

//var UAParser = require('ua-parser-js')
//var parser = new UAParser()
var async = require('async')

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('cart', { operation: operation, payload: payload, error: error })
})


exports.handler = function( event, context ) {
	var $tasks = 1
	
	console.log(event.site, event.cart.total )
	// update cart total
	var $d = new Date().toISOString().replace('T',' ').substr(0,19)
	var _date = $d.substr(0,19) 
	var _month = $d.substr(0,7)
	var $client = null

	async.parallel([
		function(cb) {
			// insert into client log
			lambda.client_log({
						client: event.site + ' ' + event.session,
						timestamp: event.enhanced_time,
						type: 'cart_total',
						total: event.cart.total	
				}, function(err) {
					if ( err )
						console.log("client_log call failed")
					else
						console.log("client_log call ok")

					cb()
				} )
		},
		function(cb) {
			DynamoDB
				.table('clients')
				.where('site').eq( event.site )
				.where('session').eq( event.session )
				.consistentRead()
				.get(function( err, data ) {
					if (err)
						return cb(err)
					
					$client = data
					cb()
				})
		}
	
	], function(err) {
		if (err)
			return context.done(err)
		
		if (!Object.keys($client).length) {
			console.log("clients.get client not found, should exist becauseof pageview")
			return context.done({errorMessage: "Client not found in session", event: event })
		}
		
		// @todo: dont update if total is the same ...
		// cart_enabled dont matter, if there is a cart call, then cart is enabled!

		if (event.cart.total === 0) {
			if ($client.hasOwnProperty('cart') && $client.cart.hasOwnProperty('total') && $client.cart.total > 0 ) {
				// if old total > 0 then dont remove from index
				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.update( {
						_date: event._date,
						_month: event._month,
						cart: {
							total: event.cart.total
						}
					}, function( err ) {
						if (err) {
							console.log("clients.cart.total update failed")
							return context.done(err)
						}
						console.log("clients.cart.total updated to 0 but kept in index")
						context.done()
					})
			} else {
				// remove from index
				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.delete(['_date','_month','cart'], function( err ) {
						if (err) {
							console.log("clients.cart.total delete failed")
							return context.done(err)
						}
						
						console.log("clients.cart.total deleted")
						context.done()
					})
			}

		} else {
			DynamoDB
				.table('clients')
				.where('site').eq( event.site )
				.where('session').eq( event.session )
				.update( {
					_date: event._date,
					_month: event._month,
					cart: {
						total: event.cart.total
					}
				}, function( err ) {
					if (err) {
						console.log("clients.cart.total update failed")
						return context.done(err)
					} 
					
					console.log("clients.cart.total update updated")
					context.done()
				})
		}
	})


}

