process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
$stats = require("node-stats")($credentials).Stats
var lambda = require('lib/lambda')

var DynamoDB = require('aws-dynamodb')($credentials)
//var UAParser = require('ua-parser-js')
//var parser = new UAParser()

var async = require('async')
var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({ uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	console.log("DYNAMOERR pageview", operation, payload, error )
	//logger.log('pageview', { operation: operation, payload: payload, error: error })
	//console.log("------------------------------------------------------")
	//console.log(operation)
	//console.log(payload)
	//console.log(error)
	//console.log("------------------------------------------------------")
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
	//var $ua = parser.setUA( event.client.ua ).getResult()
	//console.log($ua)
	//console.log("BEGIN", event.site, " ip: ",event.client.ip, " session:",event.session )
	console.log("CART ENABLED ",event.cart_enabled)

	async.parallel([


	
		// get client (consistent read)
		function(cb){
			DynamoDB
				.table('clients')
				.where('site').eq( event.site )
				.where('session').eq( event.session )
				.consistentRead()
				.get(function( err, data ) {
					if (err) {
						console.log("failed getting client")
						return cb(err)
					}
					if (Object.keys(data).length) {
						// update
						var $client_update = {
							updated: event.enhanced_time,
						}
						if (event.client.hasOwnProperty('current_page') && event.client.current_page !== false ) {
							$client_update.exitpage = event.client.current_page
						}
						if ( event.client.time_on_site !== false ) {
							$client_update.client = data.client
							$client_update.client.time_on_site = event.client.time_on_site
						}
						if (event.cart_enabled != "1") {
							$client_update.cart = {
								total: 0
							}
							$client_update._date = event._date
							$client_update._month = event._month
						}
						DynamoDB
							.table('clients')
							.where('site').eq( event.site )
							.where('session').eq( event.session )
							.update( $client_update, function( err, data ) {
								if (err) {
									console.log("client update failed")
									return cb(err)
								} 
								console.log('client updated', $client_update )
								
								DynamoDB
									.table('clients')
									.where('site').eq( event.site )
									.where('session').eq( event.session )
									.increment({ pageviews: 1 }, function() {
										if (err)
											console.log("failed incrementing pageviews")
										else
											console.log('incremented pageviews')
										
										cb(null)
									})
							})
					} else {
						var $client_insert = {
							site: event.site,
							session: event.session,
							created: event.enhanced_time,
							updated: event.enhanced_time,

							form: {
								//firstname: null,
								//lastname: null,
								//email: null
							},
							rawform: {
							},
							progress: {
								//registered: false,
								//logged: false,
								//marketed_popup: false,
								//marketed_email: false,
								//recovered: false,
								//finalized: false
							},
							client: {
								ip: event.client.ip,
								browser: event.client.browser,
								os: event.client.os,
								country: event.client.country
							},

							pageviews: 1,
							exitpage:  (event.client.hasOwnProperty('current_page') && event.client.current_page !== false ) ? event.client.current_page : undefined,
							referer: ( event.client.referer !== false && event.client.referer.length ) ?  { full: event.client.referer }: undefined,
							referer_date: ( event.client.referer !== false && event.client.referer.length ) ?  event._date : undefined
						}						
						if (event.cart_enabled != "1") {
							$client_insert.cart = {
								total: 0
							}
							$client_insert._date = event._date
							$client_insert._month = event._month
						}

						
						
						DynamoDB
							.table('clients')
							.insert( $client_insert, function( err, data ) {
								if (err )
									return cb(err)
	
								cb(null)
							})
					}
				})
		},	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
		// log referer
		function(cb){
			if (event.client.referer !== false ) {
				lambda.client_log({
					client: event.site + ' ' + event.session,
					timestamp: event.enhanced_time_start,
					type: 'r',
					url: event.client.referer			
				}, function(err) {
					if (err)
						console.log("client_log referer failed")
					else
						console.log("client_log referer OK") 

					cb(null)
				})
			} else {
				cb(null)
			}
		},
		
		
		
		

		
		// log pageview
		function(cb){
			lambda.client_log({
					client: event.site + ' ' + event.session,
					timestamp: event.enhanced_time,
					type: 'pv',
					url: event.client.current_page,
					ip: event.client.ip,

					b_n: event.client.browser === false ? '(empty)' : event.client.browser ,
					b_v: event.client.browser_version === false ? '(empty)' : event.client.browser_version ,
					os_n: event.client.os === false ? '(empty)' : event.client.os ,
					os_v: event.client.os_version === false ? '(empty)' : event.client.os_version ,
					dev_n: event.client.device === false ? '(empty)' : event.client.device

					//'dev_model' => array('S' => empty($ua->device->model) ? '(empty)' : $ua->device->model ),
					//'dev_vendor' => array('S' => empty($ua->device->vendor) ? '(empty)' : $ua->device->vendor ),
					//'dev_type' => array('S' => empty($ua->device->type) ? '(empty)' : $ua->device->type ),		
			}, function( err ) {
				if ( err )
					console.log("pageview call failed")
				else
					console.log("pageview call ok")
				
				cb(null)
			})

		},

		// update site last_load if necesary
		function(cb){
			if (event.update_site_last_load) {
				$lambda.invoke({
					FunctionName: 'keptify-site-activate',
					InvocationType: 'Event',
					Payload : JSON.stringify({
						site: event.site,
					})
				}, function( err, data ) {
					cb()
				})
			} else {
				cb()
			}
		},
		
		
		
		
		
		// update stats
		//function(cb){
		//	$stats.inc('ROOT', 'DAY', event.stats_inc, function(err) {
		//		if (err) 
		//			console.log("ROOT DAY inc failed", err)
		//		else
		//			console.log("ROOT DAY inc")
		//		
		//		cb(null, 'one');
		//	})
		//},
		function(cb){
			$stats.inc(event.site, 'DAY', event.stats_inc, function(err) {
				if (err) 
					console.log(event.site, " DAY inc failed", err )
				else
					console.log(event.site, " DAY inc")
				
				cb(null, 'two');
			})
		},
		function(cb){
			$stats.inc('ROOT', 'MIN', event.stats_inc, function(err) {
				if (err) 
					console.log("ROOT MIN inc failed", err)
				else
					console.log("ROOT MIN inc")
				cb(null, 'three');
			})
		},
		function(cb){
			$stats.inc(event.site, 'MIN', event.stats_inc, function(err) {
				if (err) 
					console.log(event.site, " MIN inc failed", err)
				else
					console.log(event.site, " MIN inc")
				cb(null, 'four');
			})
		},
		
		
		
		
		
		
		
		
		
		
		
	], function(err, results){
		console.log("async finished err=", err )
		context.done(err)
	});




	

	

	

	








	

	


}

