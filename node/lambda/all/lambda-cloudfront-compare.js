process.env.TZ = 'UTC'

var async = require('async')


var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA",
    "secretAccessKey": "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",
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

var request = require('request')
var async = require('async')
var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
    accessKeyId: "AKIAJQ4VVBL5RZOGD6IA",
    secretAccessKey: "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",
    region: "eu-west-1"
})

var $toEmail = 'contact@keptify.com'



exports.handler = function( event, context ) {
	console.log(event)

	var $keptify = null
	var $cartbooster = null
	var $s3 = null

	async.parallel([
		function(cb) {
			request('http://app.cart-booster.com.s3-eu-west-1.amazonaws.com/' + event.site, function(err, response, body ) {
				if (err)
					return cb(err)

				if (response.statusCode !== 200) {
					$s3 = false
					cb()
				}else{
					$s3 = body
					cb()
				}
			})
		},
		function(cb) {
			request('http://app.cart-booster.com/' + event.site, function(err, response, body ) {
				if (err)
					return cb(err)

				if (response.statusCode !== 200) {
					$cartbooster = false
					cb()
				}else {
					$cartbooster = body
					cb()
				}
			})
		},
		function(cb) {
			request('http://app.keptify.com/' + event.site, function(err, response, body ) {
				if (err)
					return cb(err)

				if (response.statusCode !== 200) {
					$keptify = false
					cb()
				}else{
					$keptify = body
					cb()
				}
			})
		}
	], function(err) {
		if (err)
			return context.done(err)

		var $code_is_live = true
		if (
			$keptify === false ||
			$cartbooster === false ||
			$s3 === false
		) {
			$code_is_live = false
		}

		if ($s3 !== $keptify)
			$code_is_live = false

		if ($s3 !== $cartbooster)
			$code_is_live = false

		DynamoDB
			.table('sites')
			.where('hash').eq(event.site)
			.update({ code_live: $code_is_live }, function(err,data) {
				if (err)
					return context.done(err)

				// update logs
				if (!$code_is_live) {
					console.log("code is not live")

					DynamoDB
						.table('log')
						.where('id').eq('code-not-live-' + event.site )
						.insert_or_update({
							message: "Cloudfront code for website " + event.site + " is not live!",
							site: event.site,
							timestamp: new Date().getTime(),
							type: 'notify'
						}, function(err) {
							if (err)
								console.log("inert/update into logs failed", err )


							context.done(null,$code_is_live)
						})
				} else {
					console.log("code is live")


					DynamoDB
						.table('log')
						.where('id').eq('code-not-live-' + event.site )
						.delete(function(err) {
							context.done(null,$code_is_live)
						})
				}

			})

					
	})

//Keptify website monitor 
 DynamoDB
	 .table('sites')
	 .where('hash').eq(event.site)
	 .select('hash','company_name', 'email', 'server', 'company_url', 'last_load', 'last_status')
	 .get(function( err, data ) {
	  if (err) {
		 return result.push({ success: false, errorMessage: "Could not get sites" })
	  }
		
	  console.log ("hash: ",data.hash)
	  console.log ("company name: ",data.company_name)
	  console.log ("Last status (new): ",data.last_status)
	  console.log ("Last seen: ",data.last_load)
	  
	 // if (data.last_load.hasOwnProperty('length')) {
		 var date = new Date();
		 var time_diff = (date.getTime() - Math.round(data.last_load));
		 var active = time_diff < 1000 * 60 * 60 * 24
		 if (active) {
			console.log ("The ", data.company_name, "IS ACTIVE")
		   //set site ACTIVE
		   DynamoDB
		   .table('sites')
		   .where('hash').eq(event.site)
		   .update({last_status: 'active' }, function(err,data) {  	
			  if (err)
				 context.succeed({ success: false, errorMessage: "Could not set site active" })
			  
		   })
			   
		   if (data.last_status =='inactive'){
				//Send MAIL -> status site activ
				console.log("SEND MAIL _ THE SITE " + data.company_url + " IS ACTIVATED")
			
				$lambda.invoke({
						FunctionName: 'keptify-sendmail',
						InvocationType: 'Event',
						Payload : JSON.stringify({
							site: event.site,
							from: {
								name: 'Keptify website monitor',
								email: 'noreply@keptify.com'
							},
							to: $toEmail,
							subject: data.company_name + ' is ACTIVE' ,
							body:'The site ' + data.company_url + ' is ACTIVE \n'
						})
					}, function( err, data ) {
						if (err){
							console.log("Invoke failed:", err)
						}else {
							console.log("Invoked sendmail", data)
						}
					})
				
				//To be implemented
			}
		}else { //else is not active
			console.log("site down")
		   //set site INACTIVE
			DynamoDB
		   .table('sites')
		   .where('hash').eq(event.site)
		   .update({last_status: 'inactive' }, function(err,data) {
			  if (err)
			  context.succeed({ success: false, errorMessage: "Could not set site inavtive" })
			  
		   })
		   console.log("The " +data.company_name + " is INACTIVE" )
		   //Send MAIL -> status site inactive
		   
			if (data.last_status =='active'){
				console.log("Send mail: SITE " + data.company_url + " BECAME INACTIVE")
				$lambda.invoke({
						FunctionName: 'keptify-sendmail',
						InvocationType: 'Event',
						Payload : JSON.stringify({
							site: event.site,
							from: {
								name: 'Keptify website monitor',
								email: 'noreply@keptify.com'
							},
							to: $toEmail,
							subject: data.company_name + ' is INACTIVE' ,
							body:'The site: ' + data.company_url + ' is INACTIVE \n'
						})
					}, function( err, data ) {
						if (err){
							console.log("Invoke failed:", err)
						}else {
							console.log("Invoked sendmail", data)
						}
					})
			}
		}
	  })
	
}
