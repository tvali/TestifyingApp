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
//var UAParser = require('ua-parser-js')
//var parser = new UAParser()

var async = require('async')
var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	console.log({ operation: operation, payload: payload, error: error })
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




	async.parallel({
		sites: function(callback){
			var $sites = {};
			(function ( $lastKey ) {
				var self = arguments.callee
				console.log("sites.scan")
				DynamoDB
					.table('sites')
					.index('byCompany')
					//.select('hash','company_name', 'email', 'server', 'company_url')
					.resume($lastKey)
					.scan(function( err, data ) {
						// handle error, process data ...
						if (err) {
							console.log("failed sites.scan",err)
							return callback(err);
						}
						for (var i in data)
							$sites[data[i].hash] = data[i]
					
						if (this.LastEvaluatedKey === null)
							return callback(null, $sites)


						var $this = this
						setTimeout(function() {			
							self($this.LastEvaluatedKey)
						},1000)
					})
			})(null) 
		},
		campaigns: function(callback){
			var $campaigns = {};
			(function ( $lastKey ) {
				var self = arguments.callee
				console.log( "campaigns.scan" )
				DynamoDB
					.table('campaigns')
					.resume($lastKey)
					.scan(function( err, data ) {
						
						if (err) {
							console.log("campaigns.scan error", err)
							return callback(err)
						}

						
						for (var i in data ) {
							if (!$campaigns.hasOwnProperty(data[i].site))
								$campaigns[data[i].site] = {}
							
							$campaigns[data[i].site][data[i].id] = data[i]
						}

									
						if (this.LastEvaluatedKey === null)
							return callback( null, $campaigns )

						var $this = this
						setTimeout(function() {
							self($this.LastEvaluatedKey )
						},1000)
					})
			})( null )
		},
		clients: function(callback){
			var $clients = [];
			(function ( $lastKey ) {
				var self = arguments.callee
				//console.log("clients.query", $lastKey )
				DynamoDB
					.table('clients')
					.where('_month').eq(new Date().toISOString().substr(0,7))
					// 3 days =  (1000 * 60 * 60 * 24 * 3)
					// take only last 3 hours until we migrate
					.where('_date').gt( new Date( new Date().getTime() - (1000 * 60 * 60 * 24 * 3)).toISOString().substr(0,10) ) // 
					.resume($lastKey)
					.order_by('MonthDate')
					.descending()
					.query(function( err, data ) {

						if (err) {
							console.log("clients.query error", err)
							return callback(err)
						}

						for (var i in data)
							$clients.push(data[i])
						
						//console.log("clients +", data.length )	
						
						if (this.LastEvaluatedKey === null)
							return callback(null, $clients)

						var $this = this
						setTimeout(function() {
							self($this.LastEvaluatedKey)
						},1000)
						
					})
			})( null )
		}
	},
	// optional callback
	function(err, result){
		if (err ) {
			console.log("async: something went wrong", err)
			return context.done(err)
		}
		var $sites = result.sites
		console.log("sites:", Object.keys($sites).length )

		//for (var i in $sites) {
		//	if (i == '55265ef244b69')
		//		console.log("site",i,$sites[i].company_name)
		//}
		
		var $campaigns = result.campaigns
		//console.log("campaigns:", Object.keys($campaigns).length )
		//for (var i in $campaigns) {
		//	if (i == '55265ef244b69')
		//		console.log("campaign",i,$campaigns[i]['75'].emails)
		//}
		var $clients = result.clients
		
		console.log( $clients.length )
		
		var $valid_clients = []
		var $tasks = 0

		var $finalized = 0
		for (var i in $clients) {
			// skip the ones that finished already
			if ($clients[i].hasOwnProperty('progress') && $clients[i].progress.hasOwnProperty('finalized') ) {
				$finalized++
				continue
			}
			// skip the ones that dont have email or email is not valid
			if (!$clients[i].hasOwnProperty('form'))
				continue
			
			if (!$clients[i].form.hasOwnProperty('email'))
				continue
			
			if (!validator.isEmail($clients[i].form.email))
				continue

			//console.log($clients[i].form.email)

			$valid_clients.push($clients[i])
			
		}
		console.log("clients:", $clients.length," finalized:", $finalized, " with mail: ", $valid_clients.length )
		
		$valid_clients = $valid_clients.reverse() // handle in reverse order, oldest = first
		for (var i in $valid_clients ) {
			
			if (!$valid_clients[i].hasOwnProperty('progress'))
				$valid_clients[i].progress = {}
			
			if (!$valid_clients[i].progress.hasOwnProperty('emailed'))
				$valid_clients[i].progress.emailed = {}

			var $min_ago = Math.round((new Date().getTime() - new Date($valid_clients[i]._date).getTime())/(1000 * 60))
			
			//if ($valid_clients[i].site == '55265ef244b69')
			//	console.log("found client min_ago=",$min_ago, $valid_clients[i].form.email)

			
			// for each campaign
			for (var $campaign_id in $campaigns[$valid_clients[i].site]) {
				var $already_sent = false
				if ($valid_clients[i].progress.emailed.hasOwnProperty($campaign_id))
					$already_sent = true

				if ($already_sent) {
					if ($valid_clients[i].site == '55265ef244b69') {
						console.log( $valid_clients[i].form.email, $min_ago , "min ago",  $valid_clients[i].session, "c",$campaign_id, " already sent" )
					}
				} else {
					// not sent, see if anything active ...
					$one_valid_mail = false
					for (var $email_id in $campaigns[$valid_clients[i].site][$campaign_id].emails ) {
						if ($campaigns[$valid_clients[i].site][$campaign_id].emails[$email_id].hasOwnProperty('active') &&
							$campaigns[$valid_clients[i].site][$campaign_id].emails[$email_id].active === true
						) {
							$one_valid_mail = true
						}
					}
					if ($one_valid_mail === false ) {
						if ($valid_clients[i].site == '55265ef244b69') {
							console.log( $valid_clients[i].form.email, $min_ago , "min ago",  $valid_clients[i].session, "c", $campaign_id, " inactive" )
						}
					} else {
						if ( $min_ago >  parseInt($campaigns[$valid_clients[i].site][$campaign_id].trigger_after) + 60 ) {
							if ($valid_clients[i].site == '55265ef244b69') {
							//  nocron
							//	console.log( $valid_clients[i].form.email, $min_ago , "min ago",  $valid_clients[i].session , "c", $campaign_id, " trigger after ", $campaigns[$valid_clients[i].site][$campaign_id].trigger_after , " skipped/nocron" )
							}
						} else {
							// check if time to send is under
							if ( $min_ago <  parseInt($campaigns[$valid_clients[i].site][$campaign_id].trigger_after) ) {
								if ($valid_clients[i].site == '55265ef244b69') {
									// no time to send yet 
									console.log( $valid_clients[i].form.email, $min_ago , "min ago",  $valid_clients[i].session , "c", $campaign_id, " trigger after ", $campaigns[$valid_clients[i].site][$campaign_id].trigger_after , " no time to send yet" )
								}
							} else {
								if ($valid_clients[i].site == '55265ef244b69') {
									console.log($valid_clients[i].session, $valid_clients[i].form.email, $min_ago , "min ago",  "c", $campaign_id, " trigger after ", $campaigns[$valid_clients[i].site][$campaign_id].trigger_after , " send" )
								}
								
								// Fitamamma debug
								if ($valid_clients[i].site == '53df791ea9974') {
									console.log('Debug FittaMamma DATA:' , $valid_clients[i]);
									console.log('Debug FittaMamma custom 1:' ,  $valid_clients[i].form.custom1);
								}
								
								
								$tasks++
								$lambda.invoke({
									FunctionName: 'keptify-task-email-individual',
									InvocationType: 'Event',
									Payload : JSON.stringify({
										site: $valid_clients[i].site,
										session: $valid_clients[i].session,
										enhanced_time_start: new Date().getTime() * 10,
										enhanced_time: (new Date().getTime() * 10) + Math.round(Math.random() * 10),
										_month: new Date().toISOString().substr(0,7),
										_date: new Date().toISOString().substr(0,10),
										campaign: {
											id: $campaign_id,
											body: $campaigns[$valid_clients[i].site][$campaign_id].emails[$campaign_id].body // ATM email id = campaign id
										},
										client: {
											mysql_id: 'mysql-client-id', 
											site_id: 'mysql-site-id',
										},
										'form' : {
											firstname: $valid_clients[i].form.firstname || ' ',
											lastname: $valid_clients[i].form.lastname || ' ',
											email: $valid_clients[i].form.email,
											custom1: $valid_clients[i].form.custom1 || false,
											custom2: $valid_clients[i].form.custom2 || false,
											custom3: $valid_clients[i].form.custom3 || false,
											custom4: $valid_clients[i].form.custom4 || false,
											custom5: $valid_clients[i].form.custom5 || false,
										},
										
										email: {
											//from: 'customer.care@cart-booster.com',
											from: $sites[$valid_clients[i].site].server === 'keptify' ? 'noreply@keptify.com' : 'customer.care@cart-booster.com',
											name: $sites[$valid_clients[i].site].company_name, //$client['company_name'],
											subject: $campaigns[$valid_clients[i].site][$campaign_id].emails[$campaign_id].subject || '(empty)'
										},
										
										log_type: $valid_clients[i].site == '53df791ea9974' ? 'form_sent' : 'email_sent',											
										
									})
								}, function( err, data ) {
									if (err)
										console.log("Invoke task-email-individual failed", err)
									else
										console.log("Invoked task-email-individual", data )
									
									$tasks--
								})

								
							}
						}
					}
				}
			}

		}
		
		
		console.log("EOF")

		var $interval = setInterval(function() {
			console.log("$tasks=",$tasks)
			if ($tasks <= 0) {
				console.log("reached end")
				clearInterval($interval)
				context.done()
			}
		},300)
	}
)































}

