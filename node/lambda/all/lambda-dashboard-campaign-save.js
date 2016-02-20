process.env.TZ = 'UTC'
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })

var DynamoDB = require('aws-dynamodb')($credentials)
DynamoDB.on('error', function( operation, error, payload ) {
	console.log({ operation: operation, payload: payload, error: error })
	logger.log('dashboard-campaign-save', { operation: operation, payload: payload, error: error })
})
exports.handler = function( event, context ) {
	var $tasks = 0

	console.log("site:",event.site)
	console.log("campaign id:",event.campaign_id)
	console.log("campaign name:",event.campaign_name)
	console.log("email id:",event.email_id)
	console.log("subject:",event.subject)
	console.log("trigger_after:", event.trigger_after)
	console.log("active:", event.hasOwnProperty('active') ? event.active : '(not provided)')

	$tasks++
	DynamoDB
		.table('campaigns')
		.where('site').eq( event.site )
		.where('id').eq( parseInt(event.campaign_id) ) 
		.consistentRead()
		.get(function( err, data ) {
			if (err) {
				console.log('Failed to get campaign ...')
				return context.done()
			}
			
			// new campaign
			if (Object.keys(data).length == 0) {
				console.log("campaign is new")
				// inserting
				var $new = {
						site: event.site,
						id: parseInt(event.campaign_id),
						trigger_after: parseInt( event.trigger_after ),
						emails: {}
					}
				if (event.hasOwnProperty('campaign_name') && event.campaign_name != '')
					$new.name = event.campaign_name

				$new.emails[event.email_id.toString()] = {
					active: false,
					subject: event.subject,
					body: event.body
				}
				DynamoDB
					.table('campaigns')
					.insert_or_replace( $new, function( err, data ) {
						console.log("insert", err, data )
						if ( err ) {
							console.log("insert campaign failed", err)
							console.log("failed: ", $new ) 
						} else
							console.log("campaign inserted")
						
						$tasks--
					})
				return
			}
			
			// update
			console.log("campaign already exists")
			var $new = JSON.parse(JSON.stringify(data));
			$new.trigger_after = parseInt( event.trigger_after )
			if (event.hasOwnProperty('campaign_name') && event.campaign_name != '')	
				$new.name = event.campaign_name

			$new.emails[ event.email_id.toString()] = {
				subject: event.subject,
				body: event.body
			}

			if (event.hasOwnProperty('active'))
				$new.emails[ event.email_id.toString()]['active'] = event.active

			
			delete $new.site
			delete $new.id
			console.log( "update",$new )
			console.log( "where data=", data )
			DynamoDB
				.table('campaigns')
				.where('site').eq( data.site )
				.where('id').eq( data.id )
				.update( $new , function( err, data2 ) {
					if ( err ) {
						console.log("Campaign update failed" )
					} else
						console.log("Campaign update OK", $new)
					
					$tasks--
				})
		})
		
	setInterval(function() {
		if ($tasks <= 0)
			context.done()
	},100)
}

