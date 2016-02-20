process.env.TZ = 'UTC'

var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

exports.handler = function( event, context ) {
	// event.site = hash
	
	// get all campaigns for the site
	
	DynamoDB
		.table('campaigns')
		.where('site').eq( event.site )
		.query(function( err, campaigns ) {
			if (err)
				return context.done(err)
			
			var $campaigns_total = 0
			var $campaigns_active = 0

			for (var i in campaigns ) {
				$campaigns_total++
				var $active = false
				if (!campaigns[i].hasOwnProperty('emails'))
					campaigns[i].emails = {}
				
				for (var j in campaigns[i].emails) {
					if (campaigns[i].emails[j].active === true)
						$active = true
				}
				if ($active)
					$campaigns_active++
			}
			
			// update back to site.stats
			DynamoDB
				.table('sites')
				.where('hash').eq(event.site)
				.consistentRead()
				.get(function(err,$site) {
					if (err)
						return context.done(err)
					
					
					if (!$site.hasOwnProperty('stats'))
						$site.stats = {}
					
					$site.stats.campaigns_total = $campaigns_total
					$site.stats.campaigns_active = $campaigns_active
					
					DynamoDB
						.table('sites')
						.where('hash').eq(event.site)
						.update({ stats: $site.stats }, function(err) {
							if (err)
								return context.done(err)
							
							context.done()
						})
				})

			
		})

}

