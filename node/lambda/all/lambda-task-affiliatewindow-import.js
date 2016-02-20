var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "oJDcXOPO2Ut+ypjk8ybk+1r4XDn24mEWO7fFPX0v", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var $config = {
	PublisherId: 234493, // your Publisher ID
	AffiliateApiPassword: '1d262ee2ba7c30051ad660ad006528a4a32141bdf14dcbee',  // Affiliate API Password (hash)
	ProductServeAPIPassword: "67686834a5b71726eb7a9d06e3229b47" // ProductServe API Password ( V3 MD5 )
}
var $affw = require('dbk-affiliatewindow').Affiliate($config)
var async = require('async')


exports.handler = function( event, context ) {
	var $transactions = []
	var $sites = {}
	
	if (!event.hasOwnProperty('end'))
		event.end = new Date().toISOString().substr(0,10) + 'T23:59:59'

	if (!event.hasOwnProperty('start'))
		event.start = new Date(new Date().getTime() - 1000*60*60*24*3).toISOString().substr(0,10) + 'T00:00:00'

	console.log(event.start + ' - ' + event.end )
	async.parallel([
		function( cb ) {
			(function ( $lastKey ) {
				var self = arguments.callee
				console.log("sites.scan")
				DynamoDB
					.table('sites')
					.select('hash','company_name', 'affiliate_name','affiliate_id' )
					.filter('affiliate_name').eq('affiliatewindow')
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
			$affw.getTransactionList({
				dStartDate: event.start,
				dEndDate: event.end,
				sDateType: 'transaction'
			}, function(err,data) {
				if (err)
					return cb(err)

				$transactions = data
				cb()
			})
		},
	], function(err) {
		if (err)
			return context.done(err)
		

		async.each($transactions, function(sale,cb) {

			var $site_hash = false
			for (var $i in $sites ) {
				if ($sites[$i].affiliate_id === sale['iMerchantId'] ) {
					$site_hash = $i
				}
			}
			
			if (!$site_hash) {
				console.log("site not found for advertiser",sale['iMerchantId'] )
				
			
				DynamoDB
					.table('log')
					.insert({
						id: 'affiliatewindow-unconfigured-advertiser-' + sale['iMerchantId'],
						type: 'notify',
						site: 'ROOT',
						timestamp: new Date().getTime(),
						message: "Keptify Affiliate ID not found for affiliatewindow , Affiliate ID = " + sale['iMerchantId'],
					}, function(err) {
						if (err) {
							// try update
							DynamoDB
								.table('log')
								.where('id').eq('affiliatewindow-unconfigured-advertiser-' + sale['iMerchantId'])
								.update({
									type: 'notify',
									site: 'ROOT',
									timestamp: new Date().getTime(),
									message: "Keptify Affiliate ID not found for affiliatewindow , Affiliate ID = " + sale['iMerchantId'],
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
			var $insert = {
				site: $site_hash,
				status: 'VALID', // sStatus
				network: 'affiliatewindow',
				order_id: sale['iId'],
				date: new Date(sale['dTransactionDate']).toISOString().replace('T',' ').substr(0,19),
				month: new Date(sale['dTransactionDate']).toISOString().replace('T',' ').substr(0,7),
				amount: parseInt(parseFloat(sale['mSaleAmount']['dAmount']) * 100), // see also sCurrency
				commission: parseInt(parseFloat(sale['mCommissionAmount']['dAmount']) * 100), // also sCurrency
				ip: sale['sIp'],
			}
			
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