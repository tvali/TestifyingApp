
var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
	credentials: {
		accessKeyId: "AKIAJQ4VVBL5RZOGD6IA", 
		secretAccessKey: "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", 
	},
	region: "eu-west-1"	
})

module.exports = {
	client_log: function($logdata, cb) {
		$lambda.invoke({
			FunctionName: 'keptify-func-client-log',
			InvocationType: 'Event',
			Payload : JSON.stringify($logdata)
		}, function( err ) {
			cb(err)
		})
	},
	client: $lambda
}