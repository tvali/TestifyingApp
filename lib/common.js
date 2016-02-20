crypto = require('crypto')
bcrypt = require('bcrypt-nodejs')
async = require('async')
var uaparser = require('ua-parser') // in the future, parse url from lambda

var Redis = require('redis')
var url = require('url')
redis = Redis.createClient(url.parse(process.env.REDIS_URL).port, url.parse(process.env.REDIS_URL).hostname)
redis.auth(url.parse(process.env.REDIS_URL).auth.split(":")[1])


var AWS = require('aws-sdk')
$lambda = new AWS.Lambda({
	credentials: {
		accessKeyId: "L5RZOGD6IA",
		secretAccessKey: "eRKMFoJrOYLDfdH/CYM47Kfs/41bF",
	},
	region: "eu-west-1"
})

DynamoDB = require('aws-dynamodb')({
	"accessKeyId": process.env['credentials.dynamodb.accessKeyId'],
	"secretAccessKey": process.env['credentials.dynamodb.secretAccessKey'],
	"region": process.env['credentials.dynamodb.region']
})

getDynamoSite = function( $site, cb ) {
	// @todo: use Redis
	redis.get('site:' + $site, function(err, redisdata) {
		// redisdata is null in case no item is found
		if (null === redisdata ) {
			DynamoDB.table('sites').where('hash').eq($site).get(function(err,data) {
				redis.setex('site:' + $site, 60, JSON.stringify([err,data]))
				cb( err,data  )
			})
		} else {
			try {
				cb.apply(this,JSON.parse(redisdata) )
			} catch (e) {
				cb.apply(this,[e])
			}
		}
	})

}

wildcard = function (wc, mystring ) {
	var $wc = wc.trim()
	if ($wc === '')
		return false

	if ($wc.indexOf('*') === -1)
		return $wc === mystring

	// it contains wildcard
	return mystring.substr(0,$wc.indexOf('*')) === $wc.substr(0,$wc.indexOf('*'))

	//return String(str).replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + ('/' || '') + '-]', 'g'), '\\$&').replace(/\\\*/g,'*.')
}
