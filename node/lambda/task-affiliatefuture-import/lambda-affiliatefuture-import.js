
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var request = require('request')

//var UAParser = require('ua-parser-js')
//var parser = new UAParser()

//var csvparser = csv.parse()
var parseXML = require('xml2js').parseString;

var sites = {}






exports.handler = function( event, context ) {
	var $tasks = 0;

	if (!event.hasOwnProperty('startDate')) {
		console.log("missing startDate=DD-MM-YYYY")
		return context.done()
	}
	if (!event.hasOwnProperty('endDate')) {
		console.log("missing endDate=DD-MM-YYYY")
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
	
	var $csvUrl = 'http://ws-external.afnt.co.uk/apiv1/AFFILIATES/affiliatefuture.asmx/GetTransactionListbyDate' +
		'?username=keptify' +
		'&password=Transilvania2012' +
		'&startDate=' + event.startDate +
		'&endDate=' + event.endDate

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
				if (data[i].hasOwnProperty('affiliate_name') && data[i].affiliate_name === 'affiliatefuture' && data[i].hasOwnProperty('affiliate_id') && data[i].affiliate_id.length )
					sites[data[i].affiliate_id] = data[i].hash
			}

			//console.log( "sites", sites )
			request( $csvUrl, function (err, res, body) {
				if (err || res.statusCode != 200) {
					console.log('paidon fetch csv failed')
					context.done()				
				}
				
				parseXML(body, {trim: true}, function (err, result) {
					if (!result.hasOwnProperty('NewDataSet')) {
						console.log('no NewDataSet')
						context.done()
						return
					}
					
					if (!result.NewDataSet.hasOwnProperty('TransactionList')) {
						console.log('no TransactionList')
						context.done()
						return
					}
					
					var data = result.NewDataSet.TransactionList

					for (var i in data) {
						console.log('AF' + data[i].TransactionID[0])
						var $update = {
							site: sites[data[i].MerchantID[0]],
							status: 'VALID',
							date: data[i].TransactionDate[0].substr(0,19).replace('T',' '),
							month: data[i].TransactionDate[0].substr(0,7),
							amount: parseInt(parseFloat(data[i].SaleValue[0]) * 100),
							commission: parseInt(parseFloat(data[i].SaleCommission[0]) * 100),
							ip: data[i].IPAddress[0],
						}
						
						var $insert = $update
						$insert.network= 'affiliatefuture'
						$insert.order_id = 'AF' + data[i].TransactionID[0]
						if (sites.hasOwnProperty(data[i].MerchantID[0])) {
							$tasks++
							DynamoDB
								.table('revenue')
								.insert_or_update( $insert, function( err, data ) {
									if (err)
										console.log("PENDING:revenue insert/update failed", err, DynamoDB.getLastQuery() )
									
									$tasks--
								})
						} else {
							console.log("Unknown merchant HASH for ", data[i].MerchantID[0] , data[i].MerchantName[0] )
						}

					}

					setInterval(function() {
						if ( $tasks <= 0 )
							context.done()
					},50)
				});

				
			})
		})



}

