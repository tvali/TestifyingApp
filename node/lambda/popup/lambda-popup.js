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

	$tasks+=4
	$stats.inc('ROOT', 'DAY', event.stats_inc, function( err ) {
		if (err) 
			console.log("ROOT DAY inc failed") 
		else 
			console.log("ROOT DAY inc")
		$tasks--
	} )
	$stats.inc('ROOT', 'HOUR', event.stats_inc, function( err ) {
		if (err) 
			console.log("ROOT HOUR inc failed") 
		else 
			console.log("ROOT HOUR inc")
		$tasks--
	})
	$stats.inc(event.site, 'DAY', event.stats_inc, function( err ) {
		if (err)
			console.log(event.site, " DAY inc failed") 
		else 
			console.log(event.site, " DAY inc")
		$tasks--
	} )
	$stats.inc(event.site, 'HOUR', event.stats_inc, function( err ) {
		if (err) 
			console.log(event.site, " HOUR inc failed") 
		else 
			console.log(event.site, " HOUR inc")
		$tasks--
	})	
	
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
				if (!data.progress.hasOwnProperty('popup'))
					data.progress.popup = {}

				var popup_date = new Date().toISOString().replace('T',' ').substr(0,19)
				if (data.progress.popup.hasOwnProperty( popup_date )) {
					data.progress.popup[ popup_date ]++
				} else {
					data.progress.popup[ popup_date ] = 1
				}
				
				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.update({
						progress: data.progress
					} , function( err, data ) {
						if (err) {
							console.log("client.progress.popup update failed")
						} else {
							console.log('client.progress.popup updated')
						}
						$tasks--
					})
			} else {
				// insert
				$tasks--
			}
		})
	
	$tasks+=1
	DynamoDB
		.table('client_log')
		.insert({
			client: event.site + ' ' + event.session,
			timestamp: event.enhanced_time_start,
			type: 'popup_show',
			ip: event.client.ip		
			// also put info about campaign			
		}, function( err, data ) {
			if (err)
				console.log("client_log popup_show error")
			else
				console.log("client_log popup_show OK") 

			$tasks--
		})	
	
	setInterval(function() {
		if ($tasks <= 0)
			context.done()
	},50)
}

