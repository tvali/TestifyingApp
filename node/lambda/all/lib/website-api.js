//var bcrypt = require('bcrypt-nodejs')


var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
    accessKeyId: "AKIAJQ4VVBL5RZOGD6IA", 
    secretAccessKey: "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", 
    region: "eu-west-1"	
})

DynamoDB = require('aws-dynamodb')()




DynamoDB.on('error', function( operation, error, payload ) {
	console.log( operation, error, payload )
    // you could use this to log fails into LogWatch for 
    // later analysis or SQS queue lazy processing
})
function WebsiteAPI() {

}
WebsiteAPI.prototype.user_logged = function( $params, callback ) {
	if ( typeof $params !== 'object') {
		$params = {}
	}
	if ($params.hasOwnProperty('session') && parseInt($params.session) > 0 ) {
	} else {
		$params.session = ((new Date().getTime()/1000 * 1000000) + Math.round(Math.random() * 1000000)).toString()
	}

	DynamoDB
		.table('sessions')
		.where('domain').eq( 'ROOT' )
		.where('id').eq($params.session)
		.get(function( err, data ) {
			if (err)
				return callback( err )
			
			if (!Object.keys(data).length)
				return callback('session-not-found')
			
			return callback(null, {
				
			} )
		})	
}
WebsiteAPI.prototype.user_login = function( $params, callback ) {
	DynamoDB
		.table('sites')
		.where('hash').eq( $params.username )
		.get(function( err, $user ) {
			if (err)
				return callback( err )
			
			if (!Object.keys($user).length)
				return callback('account-not-found')

			//var hash = $user.password.split('$')
			//var info = {algo: hash[1],seed: hash[2],cost: hash[3].substr(0,22)}
			
			if (!($params.password === $user.password)) {
			//if (!bcrypt.compareSync($params.password, $user.password )) {
				return callback('invalid-password')
			}
			
			// generate new session, insert into db and return it
			$params.session = ((new Date().getTime()/1000 * 1000000) + Math.round(Math.random() * 1000000)).toString()
			
			DynamoDB
				.table('sessions')
				.insert_or_replace({
					domain: 'ROOT',
					id: $params.session,
					authuser: $user
				}, function(err, data) {
					if (err)
						callback(err)
					else
						callback(null,{
							session: $params.session
						})
				})
		})
}
WebsiteAPI.prototype.user_logout = function( $params, callback ) {
	DynamoDB
		.table('sessions')
		.where('domain').eq('ROOT')
		.where('id').eq($params.session)
		.delete( function(err, data) {
			if (err)
				callback(err)
			else
				callback(null,{})
		})
}



/* admin functions */
WebsiteAPI.prototype.campaign_email_status = function( $params, callback ) {
	DynamoDB
		.table('campaigns')
		.where('site').eq($params.site)
		.where('id').eq(parseInt($params.campaign_id))
		.get(function( err, data ) {
			if (err)
				return callback(err, data)
			
			if (!data.hasOwnProperty('emails'))
				data.emails = {}
				
			if (!data.emails.hasOwnProperty($params.email_id))
				callback({message: "no suck email found"},data)
			
			if (parseInt($params.status))
				data.emails[$params.email_id].active = true
			else
				data.emails[$params.email_id].active = false

			// update with data
			DynamoDB
				.table('campaigns')
				.where('site').eq($params.site)
				.where('id').eq(parseInt($params.campaign_id))
				.update({
					emails: data.emails
				}, function(err, ret ) {
					if (err)
						return callback(err)
				
					$lambda.invokeAsync({
						FunctionName: 'keptify-task-site-stats-update',
						InvokeArgs : JSON.stringify({
							site: $params.site,
						})
					}, function( err ) {
						if (err)
							callback(err)
						
						callback(null,data.emails[$params.email_id].active)
					})
					
				})
				
			
		})
}


WebsiteAPI.prototype.admin_visitors_list = function( $params, callback ) {	
	// $params.site

	if ($params.site === 'ROOT') {
		DynamoDB
			.table('clients')
			.index('MonthDate')
			.descending()
			.where('_month').eq(new Date().toISOString().substr(0,7))
			.limit(100)
			.query(function( err, data ) {
				callback(err, data )
			})
	} else {
		DynamoDB
			.table('clients')
			.index('SiteDate')
			.descending()
			.where('site').eq($params.site)
			.limit(100)					
			.query(function( err, data ) {
				callback(err, data )
			})
	}
}
WebsiteAPI.prototype.admin_stats_list = function( $params, callback ) {	
	// $params.site
	// $params.date_start
	// $params.date_end
	// $params.type = 'DAY'
	
	DynamoDB
		.table('stats')
		.where('site').eq($params.site)
		.where('date').between($params.type + ' ' + $params.date_start,$params.type + ' ' + $params.date_end)
		.query(function( err, data ) {
			callback(err,data)
		})
}
WebsiteAPI.prototype.campaign_add = function( $params, callback ) {	
	var $trigger_after = $params.after_value * ( $params.after_type == 'h' ? 60 : ($params.after_type == 'd' ? 1440 : 1))
	
	if ($params.campaign_name.trim() == '')
		return callback({message: "Invalid campaign name!"})
	
	var $to_insert = {
		id: new Date().getTime(),
		site: $params.site,
		trigger_after: $trigger_after,
		
		name: $params.campaign_name,
		emails: {}
	}
	
	//return callback(null, $to_insert )
	DynamoDB
		.table('campaigns')
		.insert( $to_insert ,function(err,data) {
			if (err)
				return callback(null,err)
			
			callback( null, $to_insert )
		})
	

}
WebsiteAPI.prototype.campaign_list = function( $params, callback ) {	
	DynamoDB
		.table('campaigns')
		.where('site').eq($params.site)
		.query( function(err,data) {
			if (err)
				return callback(null,err)

			var $ret = {}
			for (var i in data)
				$ret[data[i].id] = data[i]
			
			callback( null, $ret )
		})
}
WebsiteAPI.prototype.campaign_update = function( $params, callback ) {	
	DynamoDB
		.table('campaigns')
		.where('site').eq($params.site)
		.where('id').eq($params.campaign_id)
		.query( function(err,data) {
			if (err)
				return callback(null,err)

			if (!data.length)
				return callback({errorMessage: "no such campaign"})

			if (!data[0].hasOwnProperty('emails'))
				return callback({errorMessage: "no such email"})
			
			if (!data[0].emails.hasOwnProperty($params.email_id) )
				return callback({errorMessage: "no such email"})
			
			var $emails = data[0].emails
			
			$emails[$params.email_id].subject = $params.subject
			$emails[$params.email_id].body = $params.body
			
			DynamoDB
				.table('campaigns')
				.where('site').eq($params.site)
				.where('id').eq($params.campaign_id)
				.update({
					emails: $emails
				}, function( err, data ) {
					if (err)
						return callback(err)
					
					callback( null, $emails )
				})
			
			
			
		})
}
WebsiteAPI.prototype.campaign_add_email = function( $params, callback ) {	
	DynamoDB
		.table('campaigns')
		.where('site').eq($params.site)
		.where('id').eq($params.campaign_id)
		.query( function(err,data) {
			if (err)
				return callback(null,err)

			if (!data.length)
				return callback({errorMessage: "no such campaign"})

			if (!data[0].hasOwnProperty('emails'))
				data[0].emails = {}
			
			// only until we make sure we can have multiple emails in one campaign
			$params.email_id = $params.campaign_id
			
			var $emails = data[0].emails
			$emails[$params.email_id] = {}
			$emails[$params.email_id].subject = $params.subject
			$emails[$params.email_id].body = $params.body
			
			DynamoDB
				.table('campaigns')
				.where('site').eq($params.site)
				.where('id').eq($params.campaign_id)
				.update({
					emails: $emails
				}, function( err, data ) {
					if (err)
						return callback(err)
					
					callback( null, $emails )
				})
		})
}
WebsiteAPI.prototype.sites_get = function( $params, callback ) {	
	// $params.hash
	DynamoDB
		.table('sites')
		.where('hash').eq($params.hash)
		.get(function( err, data ) {
			if (err)
				return callback(err)
			
			return callback(null, data )
		})
}
WebsiteAPI.prototype.sites_fields_update = function( $params, callback ) {
	console.log("update site:", $params.hash, " with fields=", $params.fields )
	
	// $params.fields, $params.hash
	DynamoDB
		.table('sites')
		.where('hash').eq($params.hash)
		.update({
			fields: $params.fields
		},function( err, data ) {
			if (err)
				return callback(err)
			
			return callback(null, data )
		})
}
WebsiteAPI.prototype.sites_fields_add = function( $params, callback ) {	
	// $params.name, $params.hash
	DynamoDB
		.table('sites')
		.where('hash').eq($params.hash)
		.get(function( err, $site ) {
			if (err)
				return callback(err)
			
			if (!$site.hasOwnProperty('fields'))
				$site.fields = {}
			
			$site.fields[$params.name] = false
		DynamoDB
			.table('sites')
			.where('hash').eq($params.hash)
			.update({
				fields: $site.fields
			},function( err, data ) {
				if (err)
					return callback(err)
				
				return callback(null, data )
			})
		})
}
WebsiteAPI.prototype.sites_fields_delete = function( $params, callback ) {	
	// $params.name, $params.hash
	DynamoDB
		.table('sites')
		.where('hash').eq($params.hash)
		.get(function( err, $site ) {
			if (err)
				return callback(err)
			
			if (!$site.hasOwnProperty('fields'))
				$site.fields = {}
			
			delete $site.fields[$params.name]
		DynamoDB
			.table('sites')
			.where('hash').eq($params.hash)
			.update({
				fields: $site.fields
			},function( err, data ) {
				if (err)
					return callback(err)
				
				return callback(null, data )
			})
		})
}
module.exports = new WebsiteAPI()

