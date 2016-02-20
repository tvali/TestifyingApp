var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('agregate-global-stats', { operation: operation, payload: payload, error: error })
})

exports.handler = function( event, context ) {
	var $tasks = 0		
	console.log(event)
	var $sites = []
	
	var $total_pv = 0
	var $total_vs = 0
	
	var $total_abm_n = 0
	var $total_abm_a = 0

	var $total_ab_n = 0
	var $total_ab_a = 0

	var $total_o_f_n = 0
	var $total_o_f_a = 0

	var $total_o_f_n_d_m = 0
	var $total_o_f_a_d_m = 0

	var $totals = {}
	// get all sites
	$tasks++
	DynamoDB
		.table('sites')
		.index('byCompany') // hash, company_name, email, company_url
		//.select('hash','company_name') 
		.scan(function(err, data) {
			if (err) {
				console.log("failed getting site list", err)
				context.done(true,"failed to get site list")
				return
			}
			for (var i in data) {
				$sites.push(data[i])
			}
			
			var $process_interval = setInterval(function() {
				if ($sites.length == 0) {
					console.log("finished site list");
					clearInterval($process_interval)
					$tasks--
					return
				}
				var $site = $sites.pop()

				if ($site.hasOwnProperty('hash') && $site.hash !== 'ROOT') {
					console.log("processing",$site.company_name)
					
					$tasks++
					DynamoDB
						.table('stats')
						//.select(
						//	'pv','vs',
						//	'abm_n','abm_a',
						//	'ab_n','ab_a',
						//	'o_f_n','o_f_a',
						//	'o_f_n_d_m','o_f_a_d_m'
						//)
						.where('site').eq($site.hash)
						.where('date').eq('DAY ' + event.date )
						.get(function(err, data) {
							if (err) {
								context.done(err,"failed to get stats")
								return
							}

							for (var i in data) {
								if (
									(i !== 'site') &&
									(i !== 'date')
								) {
									if (!$totals.hasOwnProperty(i))
										$totals[i] = 0
									
									$totals[i]+= data[i]
								}

							}
							
							//if (data.hasOwnProperty('pv'))
							//	$total_pv+= data.pv
							
							//if (data.hasOwnProperty('vs'))
							//	$total_vs+= data.vs

							//if (data.hasOwnProperty('abm_n'))
							//	$total_abm_n+= data.abm_n
							
							//if (data.hasOwnProperty('abm_a'))
							//	$total_abm_a+= data.abm_a
							
							//if (data.hasOwnProperty('ab_n'))
							//	$total_ab_n+= data.ab_n
							
							//if (data.hasOwnProperty('ab_a'))
							//	$total_ab_a+= data.ab_a

							//if (data.hasOwnProperty('o_f_n'))
							//	$total_o_f_n+= data.o_f_n
							
							//if (data.hasOwnProperty('o_f_a'))
							//	$total_o_f_a+= data.o_f_a

							//if (data.hasOwnProperty('o_f_n_d_m'))
							//	$total_o_f_n_d_m += data.o_f_n_d_m
							
							//if (data.hasOwnProperty('o_f_a_d_m'))
							//	$total_o_f_a_d_m+= data.o_f_a_d_m
							
							$tasks--
						}) 
				}
				
			},100) // adjust acccording to lambda RAM
		})
	
	var $interval = setInterval(function() {
		if ($tasks <= 0) {
			$tasks = 999999; // avoid loop until its updated
			console.log($totals['site'])
			//console.log( Object.keys($totals).join(' ')  )
			
			DynamoDB
				.table('stats')
				.where('site').eq('ROOT')
				.where('date').eq('DAY ' + event.date )
				.update($totals, function( err, data ) {
					if (err)
						console.log(err, data)
					else
						console.log("updated ROOT DAY abm_a,abm_n")

					clearInterval($interval)
					context.done()
				})
		}
	},50)
}

