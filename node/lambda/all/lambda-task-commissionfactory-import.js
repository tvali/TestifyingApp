
//TESTING VALI FRANKFURT
/*
  var $credentials = {
    "accessKeyId": "AKIAIFODYZF4YOFZLGLA",
    "secretAccessKey": "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",
    "region": "eu-central-1"
}
*/

//DYNAMO IRLAND
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA",
    "secretAccessKey": "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",
    "region": "eu-west-1"
}


var DynamoDB = require('aws-dynamodb')($credentials)

var request = require('request');

var async = require('async')


exports.handler = function( event, context ) {
	var $transactions = []
	var $sites = {}
	
	if (!event.hasOwnProperty('end'))
		event.end = new Date().toISOString().substr(0,10)

	if (!event.hasOwnProperty('start'))
		event.start = new Date(new Date().getTime() - 1000*60*60*24*3).toISOString().substr(0,10)

	console.log(event.start + ' - ' + event.end )
	async.parallel([
		function( cb ) {
			(function ( $lastKey ) {
				var self = arguments.callee
				console.log("sites.scan")
				DynamoDB
					.table('sites')
					.select('hash','company_name', 'affiliate_name','affiliate_id' )
					.filter('affiliate_name').eq('commissionfactory')
					.resume($lastKey)
					.scan(function( err, data ) {
						// handle error, process data ...
						if (err) {
							console.log("failed sites.scan",err)
							return cb(err);
						}
						for (var i in data)
							$sites[data[i].hash] = data[i]
					
						if (this.LastEvaluatedKey === null)
							return cb(null, $sites)

						var $this = this
						setTimeout(function() {			
							self($this.LastEvaluatedKey)
						},1000)
					})
			})(null)
		},
		function(cb) {
			request('https://api.commissionfactory.com/V1/Affiliate/Transactions?apiKey=77a1d189a1794b019559a0f2e3263d46&fromDate='+event.start+'&toDate='+event.end, function (error, response, data) {
				//Check for error
				if(error){
					return console.log('Error:', error);
				}

				//Check for right status code
				if(response.statusCode !== 200){
					console.log('Invalid Status Code Returned:', response.statusCode);
					return cb(response.statusCode);
				}
				//All is good.
				$transactions = JSON.parse(data)
				//console.log("data from api: ", data)
				
				cb()
			}, "json");
		
			
		},
	], function(err) {
		if (err)
			return context.done(err)
		async.each($transactions, function(sale,cb) {
			//console.log('transactions',$transactions)
			//console.log('sale+++>>>>',sale)
			var $site_hash = false
			//console.log('Sites++>>', $sites)
			for (var $i in $sites ) {
				console.log('compare++>>'+$sites[$i].affiliate_id +'===' + sale['MerchantId'] )	
				if ($sites[$i].affiliate_id == sale['MerchantId'] ) {
					$site_hash = $i
				}
			}
			
			if (!$site_hash) {
				console.log("site not found for advertiser",sale['MerchantId'] )
							
				DynamoDB
					.table('log')
					.insert({
						id: 'commissionfactory-unconfigured-advertiser-' + sale['MerchantId'],
						type: 'notify',
						site: 'ROOT',
						timestamp: new Date().getTime(),
						message: "Keptify Affiliate ID not found for commissionfactory , Affiliate ID = " + sale['MerchantId'],
					}, function(err) {
						if (err) {
							// try update
							DynamoDB
								.table('log')
								.where('id').eq('commissionfactory-unconfigured-advertiser-' + sale['MerchantId'])
								.update({
									type: 'notify',
									site: 'ROOT',
									timestamp: new Date().getTime(),
									message: "Keptify Affiliate ID not found for affiliatewindow , Affiliate ID = " + sale['MerchantId'],
								}, function(err) {
									if (err)
										console.log(err)
									cb()
								})
							return 
						}
						cb()
					})
				return
			}
			//insert data in revenue table
			var $insert = {
				site: $site_hash,
				status: 'VALID', // sStatus
				network: 'commissionfactory',
				order_id: sale['OrderId'],
				date: new Date(sale['DateCreated']).toISOString().replace('T',' ').substr(0,19),
				month: new Date(sale['DateCreated']).toISOString().replace('T',' ').substr(0,7),
				amount: parseInt(parseFloat(sale['SaleValue']) * 100), // see also sCurrency
				commission: parseInt(parseFloat(sale['Commission']) * 100), // also sCurrency
				ip: sale['CustomerIpAddress'],
			}
			console.log('insert is++>>', $insert)
			/*
				sStatus: declined, normal, 
				dClickDate, sClickref?
			*/			
			

			DynamoDB
				.table('revenue')
				.insert_or_update( $insert, function( err ) {
					if (err)
						return cb(err)

					cb(null)
				})
	
		}, function(err) {
			if (err)
				context.done(err)

			context.done()
		})
	})

}