var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
//var lambda = require('lib/lambda')
var async = require('async')
var validator = require('validator')
var request = require('request')


exports.handler = function( event, context ) {
	
	var $clients = []
	async.parallel([
		function( cb ) {
			(function( $lastKey ) {
				var self = arguments.callee
				DynamoDB
					.table('clients')
					.index('SiteDate')
					.where('site').eq(event.site)
					.where('_date').between( event.date + ' 00:00:00', event.date + ' 23:59:59')
					.select('client','form') // 'form','progress','cart','client'
					.resume($lastKey)
					.descending()
					.query(function( err, data ) {
						// handle error, process data ...
						if (err) {
							console.log("failed getting clients")
							$tasks--
							return cb({error: 'could not get clients'})
						}
						
						console.log("got ", data.length )
						for (var i in data) {
							if (data[i].hasOwnProperty('form') && data[i].form.hasOwnProperty('email') && validator.isEmail(data[i].form.email)) {
								var $newcontact = {
									email: data[i].form.email.toLowerCase()
								}
								if (data[i].form.hasOwnProperty('firstname') && data[i].form.firstname !== '(empty)' && data[i].form.firstname.trim() !== '' )
									$newcontact['firstname'] = data[i].form.firstname
									
								if (data[i].form.hasOwnProperty('lastname') && data[i].form.lastname !== '(empty)' && data[i].form.lastname.trim() !== '')
									$newcontact['lastname'] = data[i].form.lastname
	
								$clients.push($newcontact)
							}
							
						}
						if (this.LastEvaluatedKey === null) {
							// reached end, do a callback() maybe
							return cb(null)
						} 

						var $this = this
						setTimeout(function() {
							self($this.LastEvaluatedKey)
						},1000)
					})
			})(null) 
		}
	], function( err ) {
		if (err)
			return context.done(err)
		
		console.log("clients:", $clients.length )
		
		var options = {
			uri: 'http://keptify-crm.herokuapp.com/v1/contacts/add',
			method: 'POST',
			json: {
				"key": "82544167e209d275b308f858249ded1938b8c482",
				"tenant": event.tenant,
				"contacts": $clients
			}
		}
		request(options, function (error, response, body) {
		  if (!error && response.statusCode == 200) {
			console.log(body)
			context.done(null, $clients.length )
		  } else {
			  context.done('could not post to crm api')
		  }
		})
		
	})
}