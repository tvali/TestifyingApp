var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var validator = require('validator')
var async = require('async')
var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('process-clients', { operation: operation, payload: payload, error: error })
})

exports.handler = function( event, context ) {
	var $tasks = 0		
	console.log(event.Site)
	//var $from = new Date(event.Date + ' 00:00:00').getTime() * 10
	//var $to = new Date(event.Date + ' 23:59:59').getTime() * 10

	var $stats_update = {}

	//var $abandoned_wmail = 0
	//var $finalized_total = 0
	//console.log("from",$from," to",$to)
	var $clients = []
	
	async.parallel([
		// get clients ...
		function(cb) {
			DynamoDB
				.table('clients')
				.where('site').eq(event.Site)
				.where('_date').between(event.Date + ' 00:00:00',event.Date + ' 23:59:59')
				.select('form','progress','cart','client')
				.order_by('SiteDate')
				//.having('total').gt(0)
				.descending()
				.limit(10000)
				.query(function( err, data ) {
					if (err)
						return cb(err)
					
					$clients = data
					cb(null)
				})
		},



		
	], function(err) {
		if (err)
			context.done(err)
		
		// process clients
		
		for (var i in $clients) {
			if (!$stats_update.hasOwnProperty('DAY ' + event.Date )) {
				$stats_update['DAY ' + event.Date] = { ab_n: 0, ab_a: 0, abm_n: 0, abm_a: 0, o_f_n: 0, o_f_a: 0 }
			}

			if (!$stats_update['DAY ' + event.Date].hasOwnProperty('ab_n_c_' + $clients[i].client.country ))
				$stats_update['DAY ' + event.Date]['ab_n_c_' + ($clients[i].client.country || 'XX') ] = 0

			if ($clients[i].hasOwnProperty('progress') && $clients[i].progress.hasOwnProperty('finalized')) {
				if ($clients[i].hasOwnProperty('cart') && $clients[i].cart.hasOwnProperty('total')) {
					if (typeof $clients[i].cart.total === "number") {
						$stats_update['DAY ' + event.Date].o_f_n += 1
						$stats_update['DAY ' + event.Date].o_f_a += $clients[i].cart.total
					}
				}
			} else {

				$stats_update['DAY ' + event.Date].ab_n++
				$stats_update['DAY ' + event.Date]['ab_n_c_' + ($clients[i].client.country || 'XX')] += 1

				if ($clients[i].hasOwnProperty('cart') && $clients[i].cart.hasOwnProperty('total'))
					$stats_update['DAY ' + event.Date].ab_a += $clients[i].cart.total


				if ($clients[i].hasOwnProperty('form') && $clients[i].form.hasOwnProperty('email') && validator.isEmail($clients[i].form.email)) {
					$stats_update['DAY ' + event.Date].abm_n += 1
					$stats_update['DAY ' + event.Date].abm_a += $clients[i].cart.total
				}
				
				
				
			}
		}


		if (typeof $stats_update['DAY ' + event.Date] == "object") {

			DynamoDB
				.table('stats')
				.where('site').eq(event.Site)
				.where('date').eq('DAY ' + event.Date)
				.update($stats_update['DAY ' + event.Date], function( err, data ) {
					if (err) {
						console.log("stats update failed", $stats_update['DAY ' + event.Date])
						context.done(err)
					}

					console.log("stats update OK", $stats_update)
					context.done()
				})
		} else {

			DynamoDB
				.table('stats')
				.where('site').eq(event.Site)
				.where('date').eq('DAY ' + event.Date)
				.delete(['ab_n','ab_a','abm_n','abm_a'], function( err, data ) {
					if (err) {
						console.log("stats clear failed")
						context.done(err)
					}
					
					console.log("stats cleared")
					context.done()
				})
		}
		
	})
	

}

/*
					// order_finish_amount_
					'o_f_a' => $amount,
					'o_f_a_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? $amount : 0,
					'o_f_a_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? $amount : 0,
					'o_f_a_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? $amount : 0,
					'o_f_a_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => 1,
					'o_f_a_b_'. $ua->ua->family => 1,
					'o_f_a_o_'. $ua->os->family => 1,

					// order_finish_number_
					'o_f_n' => 1,
					'o_f_n_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? 1 : 0,
					'o_f_n_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? 1 : 0,
					'o_f_n_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? 1 : 0,
					'o_f_n_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => 1,
					'o_f_n_b_'. $ua->ua->family => 1,
					'o_f_n_o_'. $ua->os->family => 1,
					
					// recovered_amount
					'r_a' => $amount,
					'r_a_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? $amount : 0,
					'r_a_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? $amount : 0,
					'r_a_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? $amount : 0,
					'r_a_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => 1,
					'r_a_b_'. $ua->ua->family => 1,
					'r_a_o_'. $ua->os->family => 1,

					// recovered_number
					'r_n' => 1,
					'r_n_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? 1 : 0,
					'r_n_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? 1 : 0,
					'r_n_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? 1 : 0,
					'r_n_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => 1,
					'r_n_b_'. $ua->ua->family => 1,
					'r_n_o_'. $ua->os->family => 1,
					
					
					'ab_n' => -1,
					'ab_n_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? -1 : 0,
					'ab_n_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? -1 : 0,
					'ab_n_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? -1 : 0,
					'ab_n_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => 1,
					'ab_n_b_'. $ua->ua->family => -1,
					'ab_n_o_'. $ua->os->family => -1,

					'ab_a' => -$amount,
					'ab_a_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? -$amount : 0,
					'ab_a_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? -$amount : 0,
					'ab_a_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? -$amount : 0,
					'ab_a_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => -$amount,
					'ab_a_b_'. $ua->ua->family => -$amount,
					'ab_a_o_'. $ua->os->family => -$amount,		
*/
