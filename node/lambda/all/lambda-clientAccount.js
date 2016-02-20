

var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA",
    "secretAccessKey": "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",
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)


uniqid = function (pr, en) {
	var pr = pr || '', en = en || false, result;
	this.seed = function (s, w) {
	s = parseInt(s, 10).toString(16);
	return w < s.length ? s.slice(s.length - w) : (w > s.length) ? new Array(1 + (w - s.length)).join('0') + s : s;
	};
	result = pr + this.seed(parseInt(new Date().getTime() / 1000, 10), 8) + this.seed(Math.floor(Math.random() * 0x75bcd15) + 1, 5);
	if (en) result += (Math.random() * 10).toFixed(8).toString();
	return result;
};


exports.handler = function (event, context) {
console.log("all ok")
console.log("event",event)
console.log("context",context)
DynamoDB
	.table('sites')
	.insert({
		hash:uniqid(),
		password: event[4].value,
		company_url: event[5].value,
		profile_firstname: event[0].value,
		email: event[2].value,
		profile_phone: event[1].value,
		signup_self_date: new Date().getTime(),
		signup_self_ip: event[6].value
	
	}, function(err) {
		if (err) {
		console.log("inert/update into logs failed", err )
		context.done(null,"Error insert into DB")
		}
		context.done(null,"ok")
		
	})

}
