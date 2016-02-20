
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var request = require('request')

var UAParser = require('ua-parser-js')
//var parser = new UAParser()
var csv = require('csv')
//var csvparser = csv.parse()

var sites = {}



function stats_inc( $target, $type, $keys, callback ) {
	var $d = new Date()
	var $date = ''
	//$d.getFullYear() + '-' + ('0' + ($d.getMonth() + 1)).substr(-2) + '-' + ( '0' + $d.getDay()).substr(-2)

	if ($type == 'MONTH')
		$date = 'MONTH ' + $d.getFullYear() + '-' + ('0' + ($d.getMonth() + 1)).substr(-2)

	if ($type == 'DAY')
		$date = 'DAY ' +  $d.getFullYear() + '-' + ('0' + ($d.getMonth() + 1)).substr(-2) + '-' + ( '0' + $d.getDate()).substr(-2)
		
	if ($type == 'HOUR')
		$date = 'HOUR ' + $d.getFullYear() + '-' + ('0' + ($d.getMonth() + 1)).substr(-2) + '-' + ( '0' + $d.getDate()).substr(-2) + ' ' + ('0' + $d.getHours()).substr(-2)		
	
	//console.log("stats_inc", $target, $type, $date, $keys )
	//console.log(new Date().getDay())
	DynamoDB
		.table('stats')
		.where('site',$target)
		.where('date',$date)
		.increment($keys,function( err, data ) {
			if (err) {
				// its probably insert error ?
				console.log("increment failed")
				$keys['site'] = $target
				$keys['date'] = $date
				DynamoDB
					.table('stats')
					.insert($keys, function( err, data ) {
						if (err )
							console.log("also insert failed")
						else 
							console.log("insert success")
						callback()
					})
				
			} else {
				console.log("increment success")
				callback()
			}
			
		})
}



exports.handler = function( event, context ) {
	var $tasks = 0;

	if (!event.hasOwnProperty('DateFrom')) {
		console.log("missing DateFrom=YYYY-MM-DD")
		return context.done()
	}
	if (!event.hasOwnProperty('DateTo')) {
		console.log("missing DateTo=YYYY-MM-DD")
		return context.done()
	}
	
	/*
		// skipped
		//'DateUpdated,' +
		//'ClickDate,' +
		//'CustomTrackingID,' +
		//'CreativeName,' +
		//'OrderNotes' +
	*/
	var $csvUrl = 'http://affiliate.paidonresults.com/api/transactions?apikey=YVYKZXKIJMXVVQITEZDF' +
		'&Format=CSV' +
		'&FieldSeparator=comma' +
		
		'&DateFrom=' + event.DateFrom +
		'&DateTo=' + event.DateTo +
		
		'&AffiliateID=41910' +
		'&Fields=' +
			'NetworkOrderID,' +

			'TransactionType,' +
			
			'MerchantID,' +
			'OrderValue,' +			
			'AffiliateCommission,' +
			
			'DateAdded,' +
			'OrderDate,' +

			'PaidtoAffiliate,' +
			'DatePaidToAffiliate,' +
			
			'IPAddress,' +			
			'HTTPReferal,' +
			'MerchantName' +
		'&DateFormat=YYYY-MM-DD HH:MN:SS' +
		'&PendingSales=YES' +
		'&ValidatedSales=YES' +
		'&VoidSales=YES' +
		'&GetNewSales=YES' +
		'&GetChanges=YES'	
	
	//request('http://affiliate.paidonresults.com/api/overview-report?apikey=YVYKZXKIJMXVVQITEZDF&Format=CSV&FieldSeparator=comma&AffiliateID=41910&Fields=MerchantId,OrderValue,PendingCommission,VoidCommission,ValidCommission&DateFormat=YYYY-MM-DD&Report=date', function (err, res, body) {

	
		
	DynamoDB
		.table('sites')
		.select('hash','company_name','affiliate_name','affiliate_id')
		.scan(function(err, data) {
			if ( err ) {
				console.log("sites list failed")
				context.done()
				return
			}

			for (var i in data) {
				if (data[i].hasOwnProperty('affiliate_name') && data[i].affiliate_name === 'paidonresults2' && data[i].hasOwnProperty('affiliate_id') && data[i].affiliate_id.length )
					sites[data[i].affiliate_id] = data[i].hash
			}

			//console.log( "sites", sites )
			console.log($csvUrl)
			request( $csvUrl, function (err, res, body) {
				if (err || res.statusCode != 200) {
					console.log('paidon fetch csv failed')
					context.done()				
				}
				
				// fetch ok, parse csv
				var f = {
					order_id: 0,
					status: 1,
					merchant_id: 2,
					amount: 3,
					commission: 4,
					added: 5,
					date: 6,
					paid: 7,
					datepaid: 8,
					ip: 9,
					referer: 10,
					merchant_name: 11
					
				}
				csv.parse( body, function(err, data){
					console.log("processing", data.length + ' records in paidon')
					// get all that we have for the day
					//DynamoDB
					//	.table('revenue')
					//	.select('order_id','status')
					//	.where('network','paidonresults')
					//	.order_by('byNetworkDate')
					//	.query(function( err, data ) {
					//		console.log( err, data )
					//	})		
				
				
				
				
				
				
				
				
				
				
				
				
				
					console.log(data)
				
					if ( err ) {
						console.log("csv parse failed")
						context.done()
					}
					
					for (var i in data) {
					
						var $update = {
							site: sites[data[i][f.merchant_id]],
							status: 'PENDING',
							date: data[i][f.date],
							month: data[i][f.date].substr(0,7),
							amount: parseInt(parseFloat(data[i][f.amount]) * 100),
							commission: parseInt(parseFloat(data[i][f.commission]) * 100),
							ip: data[i][f.ip],
						}
						var $insert = $update
						$insert.network= 'paidonresults2'
						$insert.order_id = data[i][f.order_id]
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

					var $interval = setInterval(function() {
						if ($tasks <= 0) {
							clearInterval($interval)
							context.done()
						}
					},50)					
					
				})
			})
		})
}

