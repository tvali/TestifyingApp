
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var $stats = require("node-stats")($credentials).Stats
var validator = require('validator')
var request = require('request')
//var UAParser = require('ua-parser-js')
//var parser = new UAParser()
var $sites = {}

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	console.log( operation, error, payload )
	logger.log('task-email', { operation: operation, payload: payload, error: error })
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
	var $tasks = 0
	//console.log( "event=",event )
	console.log( "event.email=",event.email )

	// check unsubscribe
	console.log("checking unsubscribed", event.form.email )
	$tasks++
	DynamoDB
		.table('unsubscribe')
		.where('site').eq( event.site )
		.where('email').eq( event.form.email )
		.get(function( err, unsubscribed ) {
			if (err) {
				console.log("could not get unsubscribed")
				context.done(err)
				return
			}
			
			if (Object.keys(unsubscribed).length) {
				console.log("skipping send, user unsubscribed")
				DynamoDB
					.table('client_log')
					.insert_or_replace({
						client: event.site + ' ' + event.session,
						timestamp: event.enhanced_time,
						type: 'email_skipped_unsubscribe', 
						email: event.form.email,						
						subject: event.email.subject	
					}, function( err, data ) {
						if (err) {
							console.log("+client_log unsubscribed Fail")
							context.fail('Error: client_log unsubscribed =  Fail');
						}
						else
							console.log("+client_log unsubscribed OK")
					
						context.done()
					})		
				return
			} 
			
			
			console.log("User not unsubscribed")
			// ok, not unsubscribed try to send ...


			// @todo: move in sendmail when its node
			event.stats_inc = { 'e_s': 1 }
			$tasks+=4
			$stats.inc('ROOT', 'DAY', event.stats_inc, function(err) {
				if (err) 
					console.log("ROOT DAY inc failed")
				else
					console.log("ROOT DAY inc")
				$tasks--
			} )
			$stats.inc('ROOT', 'HOUR', event.stats_inc, function(err) {
				if (err) 
					console.log("ROOT HOUR inc failed")
				else
					console.log("ROOT HOUR inc")
				$tasks--
			})
			$stats.inc(event.site, 'DAY', event.stats_inc, function(err) {
				if (err) 
					console.log(event.site, " DAY inc failed")
				else
					console.log(event.site, " DAY inc")
				$tasks--
			} )
			$stats.inc(event.site, 'HOUR', event.stats_inc, function(err) {
				if (err) 
					console.log(event.site, " HOUR inc failed")
				else
					console.log(event.site, " HOUR inc")
				$tasks--
			})

			

			// insert into logs
			// @todo: move in sendmail when its node

			$tasks++
			DynamoDB
				.table('client_log')
				.insert_or_replace({
					client: event.site + ' ' + event.session,
					timestamp: event.enhanced_time,
					type: event.log_type, // email_sent / form_sent for fitamamma->hubspot
					email: event.form.email,
					firstname: event.form.firstname,
					lastname: event.form.lastname,								
					subject: event.email.subject	
				}, function( err, data ) {
					if (err) {
						console.log("+client_log Fail")
						context.fail('Error insert/update the client_log table');
						}
					else
						console.log("+client_log OK")
					
					$tasks--
				})

			// insert into emails
			// @todo: move in sendmail when its node
			$tasks++
			DynamoDB
				.table('emails')
				.insert_or_replace({
					site: event.site,
					timestamp: event.enhanced_time,
					session: event.session,
					campaign: parseInt(event.campaign.id), // must be int
					sent: event.enhanced_time_start,
					// viewed = undefined
					// clicked = undefined
					// recovered = undefined
					// skip_reason = undefined
					firstname: event.form.firstname,
					lastname: event.form.lastname,
					email: event.form.email,

					from_email: event.email.from,
					from_name: event.email.name,
					subject: event.email.subject,
					body: event.email.body
				
				}, function( err, data ) {
					if (err) {
						console.log('+emails failed', err )
						context.fail('Error insert/update the emails table');
						}
					else
						console.log('+email OK')
					$tasks--
				})
				
				
			// replacements
			var $body = event.campaign.body

			$body = $body.replace(new RegExp("FIRSTNAME".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  event.form.firstname === '(empty)' ? '' : event.form.firstname )

			$body = $body.replace(new RegExp("RECOVERYLINK".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), 
				"http://t.keptify.com/cf/redirect.php" + 
				"?cl=" + event.client.mysql_id + 
				"&c=" + event.campaign.id + 
				"&s=" + event.client.site_id + 
				"&site=" + event.site +
				"&ame=" + event.enhanced_time
			)

			$body = $body.replace(new RegExp("UNSUBSCRIBELINK".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), 
				"http://t.keptify.com/cf/unsubscribe.php" +
				"?cl=" + event.client.mysql_id +
				"&c=" + event.campaign.id + 
				"&h=" + event.site +
				"&site=" + event.site +
				"&ame=" + event.enhanced_time
			)
			
			// track pixel after ...
			var $body_with_track_pixel = $body + 
			"<img src='http://t.keptify.com/cf/v.php" + 
				"?c=" + event.campaign.id + 
				"&site=" + event.site +
				"&ame="  + event.enhanced_time + 
				"' />"
			
			
			if (event.site == '53df791ea9974') {
				
				console.log("skipping fitamamma")
				$tasks = 0
				//return
				
				// fitamamma exception
				$tasks++
				console.log("fitamama exception" )
				var $form = { 
					firstname: event.form.firstname,
					lastname: event.form.lastname,
					email: event.form.email,
					"how_many_weeks_pregnant_are_you_" : event.form.custom1 === false ? '- Please Select -' : event.form.custom1 
				}
				
				request.post(
					'https://forms.hubspot.com/uploads/form/v2/353750/4dd5d03e-2d43-49de-bf44-d433a8261f9b',
					{ 
						form: $form
					},
					function (err, response, body) {
						if (err)	
							console.log("fitamamma post error", err)
							
						console.log("fitamamma form responded")
						console.log('body', body )
						//console.log("response", response )
						if (!err && response.statusCode == 200) {
							console.log("Form status: ok (200)")
						}
						
						console.log("Invoking sendform for us...")
						$tasks--
					}
				)
			} else {
				$tasks++		
				DynamoDB
					.table('clients')
					.where('site').eq(event.site)
					.where('session').eq(event.session)
					.consistentRead()
					.get(function( err, data ) {
						if (err){
							console.log("!!!! Error get data from clients",err)
						}
						if (Object.keys(data).length) {
							// update
							if (!data.hasOwnProperty('progress')) {
								data.progress = {}
							}
							if (!data.progress.hasOwnProperty('emailed'))
								data.progress.emailed = {}
							
							data.progress.emailed[event.campaign.id] = {}
							$progress = data.progress
							//console.log("data progress:", data.progress)	
							DynamoDB
								.table('clients')
								.where('site').eq( event.site )
								.where('session').eq( event.session )
								.update({
									progress: $progress
								} , function( err, data ) {
									if (err) {
										console.log("client.progress.emailed update failed", err)
										context.fail('Error insert/update the emails table', err);
									} else {
										console.log('-Site: ' + event.site  + ' progress: ' , $progress , ' session: ' + event.session + ' client.progress.emailed updated')
						
										//	console.log("Invoking sendmail...")						
										
										
										
										var date_yest = new Date().getTime()-5400000; // 90 min ago
										//var date_yest_str = new Date(date_yest).toISOString(); 
										//console.log("Yest:"+date_yest+"  = "+date_yest_str)
										DynamoDB
											.table('MA_emails_sent')
											.where('email').eq(event.form.email)
											.having('site').eq(event.site)
											.having('date').ge(date_yest)
											.query( function( err, data ) {
												if (err) 
													console.log("Get emails_sent Error", err )
												if(data.length) {
													console.log("DUPLICATED Email found!", data)
													//writing log for error
													$insert = {date: new Date().getTime(), email: event.form.email, subject: event.email.subject, site: event.site}
													DynamoDB
														.table('MA_emails_sent_error')
														.insert( $insert, function( err, data ) {
															if (err) 
																console.log("Error update emails_sent_error", err )
															console.log("Emails_error updated")
														})
													console.log("Date sent DUPLICATE:", new Date(data[0].date).toISOString())
													
												}else{
													console.log("No email found sent from 90 min ago  - OK, can send.")
													$tasks++			
													$lambda.invoke({
														FunctionName: 'keptify-sendmail',
														InvocationType: 'Event',
														Payload : JSON.stringify({
															site: event.site,
															from: {
																name: event.email.name,
																email: event.email.from
															},
															to: event.form.email,
															subject: event.email.subject,
															body: $body_with_track_pixel
														})
													}, function( err, data ) {
														if (err)
															console.log("Invoke failed", err)
														else{
															console.log("Invoked sendmail")
														
															$insert	= {email: event.form.email, site : event.site, subject: event.email.subject, session: event.session, date : new Date().getTime()}
															DynamoDB
																.table('MA_emails_sent')
																//.select('email','site','date')
																.insert_or_update( $insert, function( err, data ) {
																	if (err) 
																		console.log("Error update emails_sent", err )
																	console.log("Emails_sent updated - ok")
																})
														}
														
														
														$tasks--
													})
										
												}
											})	
										//console.log("Invoking sendmail for us...")
										//$tasks++
										//$lambda.invoke({
										//	FunctionName: 'keptify-sendmail',
										//	InvocationType: 'Event',
										//	Payload : JSON.stringify({
										//		site: event.site,
										//		from: {
										//			name: event.email.name,
										//			email: event.email.from
										//		},
										//		to: 'keptify@keptify.com',
										//		subject: event.form.email + ' ' + event.email.subject,
										//		body: $body
										//		//body: $body_with_track_pixel
										//	})
										//}, function( err, data ) {
										//	if (err)
										//		console.log("Invoke self sendmail failed", err)
										//	else
										//		console.log("Invoked self sendmail")
										//	$tasks--
										//})	
									}
									$tasks--
								})
						} else {
							// insert
							$tasks--
						}
					})
			}
			
			$tasks--
		})
	

		
		
	var $interval = setInterval(function() {
		if ($tasks <= 0) {
			clearInterval($interval)
			context.done()
		}
	},50)
}

