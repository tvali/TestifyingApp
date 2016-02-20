
//IRL
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}

var DynamoDB = require('aws-dynamodb')($credentials)
var request = require('request')
var csv = require('csv')
var async = require('async');

sites={};	

exports.handler = function( event, context ) {

	var $csvUrl_void ='http://www.clixgalore.com/AffiliateTransactionSentReport_Export.aspx?AfID=278176&CID=232597'+
		'&ST=0' + //0 - Cancelled  1 - Confirmed  2 - Pending
		'&B=2' +  //<BASED ON> - Only required if requesting confirmed or declined sales
					/*
					If a <STATUS> of 0 (cancelled is being passed as the status)
					1 - Based On Cancelled Date
					2 - Based On Transaction Date

					If a <STATUS> of 1 (confirmed is being passed as the status)
					1 - Based On Approved Date
					2 - Based On Transaction Date
					*/
		'&RP=5' + //<REPORT PERIOD> 2 - Last 7 days 3 - Last 31 days 4 - Last 90 days 5 - Last 1 year 6 - Specific Period
		//'&SD=' + '2015-01-01' + //+ event.DateFrom +  //<START DATE> YYYY-MM-DD - Date to start the report from
		//'&ED=' + '2015-11-01' + //+ event.DateTo + //<END DATE> YYYY-MM-DD - Date to end the report
		'&type=csv' + //<EXPORT TYPE> csv - for a csv export xml - for an xml export
		'&enc=utf8';
	
	var $csvUrl_valid ='http://www.clixgalore.com/AffiliateTransactionSentReport_Export.aspx?AfID=278176&CID=232597'+
		'&ST=1' + //0 - Cancelled  1 - Confirmed  2 - Pending
		'&B=2' +  //<BASED ON> - Only required if requesting confirmed or declined sales
		'&RP=5' + //<REPORT PERIOD> 2 - Last 7 days 3 - Last 31 days 4 - Last 90 days 5 - Last 1 year 6 - Specific Period
		'&type=csv' + //<EXPORT TYPE> csv - for a csv export xml - for an xml export
		'&enc=utf8';

	var $csvUrl_pending ='http://www.clixgalore.com/AffiliateTransactionSentReport_Export.aspx?AfID=278176&CID=232597'+
		'&ST=2' + //0 - Cancelled  1 - Confirmed  2 - Pending
		'&B=2' +  //<BASED ON> - Only required if requesting confirmed or declined sales
		'&RP=5' + //<REPORT PERIOD> 2 - Last 7 days 3 - Last 31 days 4 - Last 90 days 5 - Last 1 year 6 - Specific Period
		'&type=csv' + //<EXPORT TYPE> csv - for a csv export xml - for an xml export
		'&enc=utf8';
		
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
				if (data[i].hasOwnProperty('affiliate_name') && data[i].affiliate_name === 'clixgalore' && data[i].hasOwnProperty('affiliate_id') && data[i].affiliate_id.length ){
					sites[data[i].affiliate_id] = data[i].hash
					console.log("sites found:" + data[i].hash )
				}	
			}

			//console.log( "sites", sites )
		
		
			async.parallel([
				function(callback) { //This is the first task, and callback is its callback task
					console.log("PROCESSING VALID")
					// ---PROCESSING VALID============================================================
					request( $csvUrl_valid, function (err, res, body) {
						if (err || res.statusCode != 200) {
							console.log('clixgalore VALID fetch csv failed')
							context.done()				
						}
						//fetch ok
						//console.log("Data raw received :>>" + body +"<<");
						csv.parse(body, function(err, data) {
							console.log("processing", data.length-1 + ' records VALID in clixgalore');
							//console.log("Data csv:>>" + data+"<<");
							console.log(data[0].length)
							head=[];
							var dataObj = [];
							for (var i in data) {
								if (i==0) continue //skip header
								console.log("\n\rRec no: ", i )
								console.log("Conf date: ", data[i][0]  )
								console.log("Transaction date: ", data[i][1]) 
								console.log("merchant: ", data[i][2]) 
								
								console.log("Order ID: ", (data[i][0].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][1].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][5].replace(".","").trim()) )
								console.log("Date: ", new Date (Date.parse(data[i][0])).toISOString().replace("T"," ").substr(0,19)  )
								console.log("Month: ", new Date (Date.parse(data[i][0])).toISOString().substr(0,7))
								console.log("Currency: ", data[i][3])
								console.log("Sale val: ", data[i][4].match(/[+-]?(?:\d*[.,])?\d+/)[0] )
								console.log("Commission: ", data[i][5].match(/[+-]?(?:\d*[.,])?\d+/)[0])
								console.log("IP: ", data[i][9])
							

								// insert VALIDs in database					
								//Confirmed:
									// 0 Confirmed Date,   1  Transaction Date,  2 Merchant Site,   3  Currency,   4 Sale Value, 
									// 5 Commission,       6 Aff Order ID,       7 Source,          8 Click Date,  9 IP Address,
									// 10 Status,          11 Banner,            12 Information     ,//-> not received 13 UID, 14 Currency Code
								var $update = {
										site: sites[data[i][2]],
										status: 'VALID',
										date: new Date (Date.parse(data[i][0])).toISOString().replace("T"," ").substr(0,19),
										month: new Date (Date.parse(data[i][0])).toISOString().substr(0,7) ,
										amount: parseInt(data[i][4].match(/[+-]?(?:\d*[.,])?\d+/)[0] * 100),
										currency: data[i][3] ,
										commission: parseInt(parseFloat(data[i][5].match(/[+-]?(?:\d*[.,])?\d+/)[0]) * 100),
										ip: data[i][9],
								}
								var $insert = $update
								$insert.network= 'clixgalore'
								$insert.order_id = (data[i][0].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][1].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][5].replace(".","").trim())
								if (sites.hasOwnProperty(data[i][2])) {
									console.log("insering VALID  data", data[i][2] )
										DynamoDB
											.table('revenue')
											.insert_or_update( $insert, function( err, data ) {
												if (err) {
													console.log("VALIDATED :revenue insert/update failed", err, DynamoDB.getLastQuery() )
													context.done()
												}
											})
								}	
							}
						})
						
						console.log("sites:", sites)
						callback();			
					})
				},
				
				
				function(callback) {

					console.log("PROCESSING PENDING")			
					// ---PROCESSING PENDING=================================================================
					request($csvUrl_pending, function (err, res, body) {
						if (err || res.statusCode != 200) {
							console.log('glixgalore PENDING fetch csv failed')
							context.done()
							//context.done()				
						}
						//fetch ok
						//console.log("Data raw received :>>" + body +"<<");
						csv.parse(body, function(err, data) {
							console.log("processing", data.length-1 + ' records PENDING in clixgalore');
							//console.log("Data csv:>>" + data+"<<");
							console.log(data[0].length)
							head=[];
							var dataObj = [];
							for (var i in data) {
								if (i==0) continue
								console.log("\n\rRec no: ", i )
								console.log("Transaction date: ", data[i][0]) 
								console.log("merchant: ", data[i][1]) 
								
								console.log("Order ID: ", (data[i][0].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][7].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][4].replace(".","").trim()) )
								console.log("Date: ", new Date (Date.parse(data[i][0])).toISOString().replace("T"," ").substr(0,19)  )
								console.log("Month: ", new Date (Date.parse(data[i][0])).toISOString().substr(0,7))
								console.log("Currency: ", data[i][2])
								console.log("Sale val: ", data[i][3].match(/[+-]?(?:\d*[.,])?\d+/)[0] )
								console.log("Commission: ", data[i][4].match(/[+-]?(?:\d*[.,])?\d+/)[0])
								console.log("IP: ", data[i][8])
							

								// insert PENDINGin database					
								//Pending:
								//	0 Transaction Date,	1 Merchant Site,	2 Currency,		3 Sale Value,	 4 Commission,
								//	5 Aff Order ID,		6 Source,			7 Click Date,	8 IP Address,	 9 Status,
								//	10 Banner,			11 Information, -> not received	12 UID,			13 Currency Code
								var $update_pending = {
										site: sites[data[i][1]],
										status: 'PENDING',
										date: new Date (Date.parse(data[i][0])).toISOString().replace("T"," ").substr(0,19),
										month: new Date (Date.parse(data[i][0])).toISOString().substr(0,7) ,
										amount: parseInt(data[i][3].match(/[+-]?(?:\d*[.,])?\d+/)[0] * 100),
										currency: data[i][2] ,
										commission: parseInt(parseFloat(data[i][4].match(/[+-]?(?:\d*[.,])?\d+/)[0]) * 100),
										ip: data[i][8],
								}
								var $insert = $update_pending
								$insert.network= 'clixgalore'
								$insert.order_id = (data[i][0].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][7].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][4].replace(".","").trim())
								if (sites.hasOwnProperty(data[i][1])) {
									console.log("insering PENDING data", data[i][1] )
										//$tasks++
										DynamoDB
											.table('revenue')
											.insert_or_update( $insert, function( err, data ) {
												if (err){
													console.log("PENDING :revenue insert/update failed", err, DynamoDB.getLastQuery() )
													context.done()
												}
											})
								}	
							}
							callback();
						})
					})
				},
				
				
				
							
				function(callback) { //This is the first task, and callback is its callback task
					console.log("PROCESSING VOID")
					// ---PROCESSING VOID============================================================
					request( $csvUrl_void, function (err, res, body) {
						if (err || res.statusCode != 200) {
							console.log('clixgalore VOID fetch csv failed')
							context.done()				
						}
						//fetch ok
						//console.log("Data raw received :>>" + body +"<<");
						csv.parse(body, function(err, data) {
							console.log("processing", data.length-1 + ' records VOID in clixgalore');
							//console.log("Data csv:>>" + data+"<<");
							console.log(data[0].length)
							head=[];
							var dataObj = [];
							for (var i in data) {
								if (i==0) continue //skip header
								console.log("\n\rRec no: ", i )
								console.log("Conf date: ", data[i][0]  )
								console.log("Transaction date: ", data[i][1]) 
								console.log("merchant: ", data[i][2]) 
								
								console.log("Order ID: ", (data[i][0].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][1].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][5].replace(".","").trim()) )
								console.log("Date: ", new Date (Date.parse(data[i][0])).toISOString().replace("T"," ").substr(0,19)  )
								console.log("Month: ", new Date (Date.parse(data[i][0])).toISOString().substr(0,7))
								console.log("Currency: ", data[i][3])
								console.log("Sale val: ", data[i][4].match(/[+-]?(?:\d*[.,])?\d+/)[0] )
								console.log("Commission: ", data[i][5].match(/[+-]?(?:\d*[.,])?\d+/)[0])
								console.log("IP: ", data[i][9])
							

								// insert VOIDs in database					
								//Rejected:
									// 0 Declined Date,   1  Transaction Date,  2 Merchant Site,   3  Currency,   4 Sale Value, 
									// 5 Commission,       6 Aff Order ID,       7 Source,          8 Click Date,  9 IP Address,
									// 10 Status,          11 Banner,            12 Information     ,//-> not received 13 UID, 14 Currency Code
								var $update = {
										site: sites[data[i][2]],
										status: 'VOID',
										date: new Date (Date.parse(data[i][0])).toISOString().replace("T"," ").substr(0,19),
										month: new Date (Date.parse(data[i][0])).toISOString().substr(0,7) ,
										amount: parseInt(data[i][4].match(/[+-]?(?:\d*[.,])?\d+/)[0] * 100),
										currency: data[i][3] ,
										commission: parseInt(parseFloat(data[i][5].match(/[+-]?(?:\d*[.,])?\d+/)[0]) * 100),
										ip: data[i][9],
								}
								var $insert = $update
								$insert.network= 'clixgalore'
								$insert.order_id = (data[i][0].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][1].replace(/\//g,"").replace(/ /g,"").replace(/:/g,"")+data[i][5].replace(".","").trim())
								if (sites.hasOwnProperty(data[i][2])) {
									console.log("insering VOID  data", data[i][2] )
										DynamoDB
											.table('revenue')
											.insert_or_update( $insert, function( err, data ) {
												if (err){
													console.log("VOID :revenue insert/update failed", err, DynamoDB.getLastQuery() )
													context.done()
												}
												
											})
								}	
							}
						})
						
						console.log("sites:", sites)
						callback();			
					})
				}
				
				
			], function(err){
				if (err){
					console.log("err",err)
					context.fail(err)
				}
				console.log("sites:", sites)
				context.succeed("Done, processed sites:",sites);
				
			})			
	
		})

}

