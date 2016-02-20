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

	$tasks++
	DynamoDB
		.table('client_log')
		.insert({
				client: event.site + ' ' + event.session,
				timestamp: event.enhanced_time_start,
				type: 'popup_click',
				ip: event.client.ip,

				b_n: event.client.browser === false ? '(empty)' : event.client.browser ,
				b_v: event.client.browser_version === false ? '(empty)' : event.client.browser_version ,
				os_n: event.client.os === false ? '(empty)' : event.client.os ,
				os_v: event.client.os_version === false ? '(empty)' : event.client.os_version ,
				dev_n: event.client.device === false ? '(empty)' : event.client.device		
		}, function( err, data ) {
			if ( err )
				console.log("popup_click log failed")
			else
				console.log("popup_click logged")
			
			$tasks--
		})


	$tasks++
	DynamoDB
		.table('client_log')
		.insert({
				client: event.site + ' ' + event.session,
				timestamp: event.enhanced_time,
				type: 'mark_recovered',
				ip: event.client.ip,
				// also put info about campaign	
		}, function( err, data ) {
			if ( err )
				console.log("mark_recovered log failed")
			else
				console.log("mark_recovered logged")
			
			$tasks--
		})
		
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
				if (!data.progress.hasOwnProperty('recovered'))
					data.progress.recovered = 0
					
				data.progress.recovered++

				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.update({
						progress: data.progress
					} , function( err, data ) {
						if (err) {
							console.log("client.progress.recovered update failed")
						} else {
							console.log('client.progress.recovered updated')
						}
						$tasks--
					})
			} else {
				// insert
				$tasks--
			}
		})

	
	setInterval(function() {
		if ($tasks <= 0)
			context.done()
	},50)
}

