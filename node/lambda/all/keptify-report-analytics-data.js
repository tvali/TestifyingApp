
//DYNAMO IRLAND
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA",
    "secretAccessKey": "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",
    "region": "eu-west-1"
}

var DynamoDB = require('aws-dynamodb')($credentials)

//var async = require('async')


exports.handler = function( event, context ) {

	DynamoDB
		.table('revenue')
		.select('network','commission', 'site', 'status','date' )
		.scan(function( err, data ) {
			if (err)
			 context.done("Error processing data", err)
			 $rev = [];
			for(var i in data) {
			  //if(data[i].commission > 0 && ($status.indexOf(data[i].status) > -1)) {
				if(data[i].commission > 0 ){
				$rev.push(data[i])
			  }
			}
			 //console.log("DATA>:", $rev)
			 //context.succeed({ success: true, "status":$status, "data": $rev })
			context.succeed({ success: true, "data": $rev }) 
		})
}