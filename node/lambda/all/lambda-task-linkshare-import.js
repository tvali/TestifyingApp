var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var $rakuapp = {
	// used to get a new Refresh Token
	username: 'keptify',
	password: 'compaq18',
	sid: 3234505,
	TokenRequestAuthorization: 'Basic QnV6VFh0X2FHS3RKNmhCOGhFbG5GaWpwVW53YTpObnpVUGU0WURuRXc1TUdCdk5NMkdaZml0YVVh',
	
	SecurityToken: '5efae6a108b556d2231c61be6fdc3d9c3fea02b75ccee7148c580f183fd3f481',
	// 
	//ConsumerKey: 'BuzTXt_aGKtJ6hB8hElnFijpUnwa',
	//ConsumerSecret: 'NnzUPe4YDnEw5MGBvNM2GZfitaUa',
	
}
var RakutenAffiliate = require('dbk-rakuten').Affiliate($rakuapp)
var async = require('async')

exports.handler = function( event, context ) {
	var $rakuten = []
	var $sites = {}
	async.parallel({
		sites: function(cb) {

			(function ( $lastKey ) {
				var self = arguments.callee
				console.log("sites.scan")
				DynamoDB
					.table('sites')
					.select('hash','company_name', 'affiliate_name','affiliate_id' )
					.filter('affiliate_name').eq('linkshare')
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
		rakuten: function(cb) {

			RakutenAffiliate.requestAccessToken(function(err,token) {
				if (err)
					return cb(err, 'cloud-not-get-access-token')
				
				RakutenAffiliate.Report({
					bdate: event.bdate ? event.bdate : new Date(new Date().getTime() - 1000*60*60*24).toISOString().substr(0,10).replace('-','').replace('-',''), 
					edate: event.edate ? event.edate : new Date(new Date().getTime() + 1000*60*60*24).toISOString().substr(0,10).replace('-','').replace('-',''), 
				}, function(err,data) {
					if (err)
						return cb(err,'could-not-get-report')
					
					$rakuten = data
					cb(null)
				})
			})

		}
	}, function(err,res) {
		if (err)
			return context.done(err)
		
		console.log("ended, sites=", $sites )
		//console.log("ended, rakuten=", $rakuten )
		
		async.each($rakuten, function(sale,cb) {
			//console.log("sale=",sale)
			
			var $site_hash = false
			
			for (var $i in $sites ) {
				if ($sites[$i].affiliate_id === sale['Advertiser ID'] ) {
					$site_hash = $i
				}
			}
			
			if (!$site_hash) {
				console.log("site not found for advertiser",sale )
				
				DynamoDB
					.table('log')
					.insert({
						id: 'linkshare-unconfigured-advertiser-' + sale['Advertiser ID'],
						type: 'notify',
						site: 'ROOT',
						timestamp: new Date().getTime(),
						message: "Keptify Affiliate ID not found for linkshare site " + sale['Advertiser']  + ", Linkshare Affiliate ID = " + sale['Advertiser ID'],
					}, function(err) {
						if (err) {
							// try update
							DynamoDB
								.table('log')
								.where('id').eq('linkshare-unconfigured-advertiser-' + sale['Advertiser ID'])
								.update({
									type: 'notify',
									site: 'ROOT',
									timestamp: new Date().getTime(),
									message: "Keptify Affiliate ID not found for linkshare site " + sale['Advertiser']  + ", Linkshare Affiliate ID" + sale['Advertiser ID'],
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
				status: 'VALID',
				network: 'linkshare',
				order_id: sale['Order ID'], 
				date: new Date(sale['Date'] + ' ' + sale['Time']).toISOString().replace('T',' ').substr(0,19),
				month: new Date(sale['Date'] + ' ' + sale['Time']).toISOString().replace('T',' ').substr(0,7),
				amount: parseInt(parseFloat(sale['Sales']) * 100),
				commission: parseInt(parseFloat(sale['Commissions']) * 100),
			//	ip: data[i][f.ip],
			}
			DynamoDB
				.table('revenue')
				.insert_or_update( $insert, function( err, data, query ) {
					if (err)
						return cb(err)

					cb(null)
				})
			
			
		}, function(err) {
			if (err)
				context.done(err)
			
			context.done()
		})

/*
					for (var i in data) {
					

						if (sites.hasOwnProperty(data[i][f.merchant_id])) {
							console.log( data[i][f.order_id] )
							if (data[i][f.status] == 'PENDING') {
								// insert into database, if possible, find session
								//console.log('PENDING', data[i] )
		
								$insert.status = 'PENDING'

								$tasks++
								DynamoDB
									.table('revenue')
									.insert_or_update( $insert, function( err, data ) {
										if (err)
											console.log("PENDING:revenue insert/update failed", err, DynamoDB.getLastQuery() )
										
										$tasks--
									})

							} else if (data[i][f.status] == 'VALIDATED') {
								$insert.status = 'VALID'
								$tasks++
								DynamoDB
									.table('revenue')
									//.where('network', 'paidonresults')
									//.where('order_id', data[i][f.order_id])
									.insert_or_update( $insert, function( err, data, query ) {
										if (err)
											console.log("VALIDATED:revenue insert/update failed", err, query )
										
										$tasks--
									})
							} else if (data[i][f.status] == 'VOID') {
								$insert.status = 'VOID'
								$tasks++
								DynamoDB
									.table('revenue')
									//.where('network', 'paidonresults')
									//.where('order_id', data[i][f.order_id])
									.insert_or_update( $insert, function( err, data, query ) {
										if (err)
											console.log("VOID:revenue insert/update failed", err, query )
										
										$tasks--
									})
							} else {
								console.log("unhandled status ", data[i][f.status])
							}

						} else {
							console.log("Unknown merchant HASH for ", data[i][f.merchant_name] , data[i][f.merchant_id] )
						}
						
					}
*/

		
	})




}

