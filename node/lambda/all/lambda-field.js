
var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
$stats = require("node-stats")($credentials).Stats
//var UAParser = require('ua-parser-js')
//var parser = new UAParser()
var lambda = require('lib/lambda')
var async = require('async')

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('field', { operation: operation, payload: payload, error: error })
})

exports.handler = function( event, context ) {

	console.log("event.field=",event.field)
	var $client
	if (event.hasOwnProperty('site_obj')) {
		if (!event.site_obj.hasOwnProperty('fields')) 
			event.site_obj.fields = {}

		// support pattern in site.fields[fieldname*], replace event.field.name with its pattern
		for (var i in event.site_obj.fields) {
			if (event.site_obj.fields.hasOwnProperty(i)) {
				//if (new RegExp("^" + (i.replace(/[*]/g,".*") ) + "$").test(event.field.name) && (event.field.name !== i)) {
				if (new RegExp("^" + (i.replace(/\[/g || /\]/g || /\./g,"").replace(/[*]/g,".*") ) + "$").test(event.field.name) && (event.field.name !== i)) {
						
				console.log(event.field.name," matches ", i )
					event.field.name = i
				}
			}
		}
	}	

	async.parallel([
		// stats
		function( cb ) {
			if (event.stats_inc !== false) {
				$stats.inc('ROOT', 'DAY', event.stats_inc, function(err) {
					if (err) console.log("ROOT DAY inc failed")
					cb()
				} )
			} else {
				cb()
			}
		},
		function( cb ) {
			if (event.stats_inc !== false) {
				$stats.inc('ROOT', 'HOUR', event.stats_inc, function(err) {
					if (err) console.log("ROOT HOUR inc failed")
					cb()
				})
			} else {
				cb()
			}
		},
		function( cb ) {
			if (event.stats_inc !== false) {
				$stats.inc(event.site, 'DAY', event.stats_inc, function(err) {
					if (err) console.log(event.site, " DAY inc failed")
					cb()
				})
			} else {
				cb()
			}
		},
		function ( cb ) {
			if (event.stats_inc !== false) {
				$stats.inc(event.site, 'HOUR', event.stats_inc, function(err) {
					if (err) console.log(event.site, " HOUR inc failed")
					cb()
				})
			} else {
				cb()
			}
		},
		
		// add new field if site doesnt have it already
		function( cb ) {
			if (event.hasOwnProperty('site_obj')) {
				// add new field, if site does not have it already
				if (!event.site_obj.fields.hasOwnProperty(event.field.name) ) {
					event.site_obj.fields[ event.field.name] = false
					
					// update back to DynamoDB
					DynamoDB
						.table('sites')
						.where('hash').eq(event.site)
						.update({
							fields: event.site_obj.fields
						}, function( err, data ) {
							if (err)
								console.log('failed updating site.fields[', event.field.name ,']')
							else
								console.log('updated site.fields[', event.field.name ,']')
							
							cb()
						})
				} else {
					console.log('site.fields[', event.field.name ,'] already exists')
					cb()
				}
			} else {
				cb()
			}
		},
		function( cb ) {
			DynamoDB
				.table('clients')
				.where('site').eq( event.site )
				.where('session').eq( event.session )
				.consistentRead()
				.get(function( err, data ) {
					if (err)
						return cb( err )
				
					$client = data
					if (!Object.keys($client).length) {
						console.log("client is empty ", Object.keys($client) ,$client )
						return cb({errorMessage: 'inexistent session in clients', site: event.site, session: event.session })
					}
					cb()
				})
		}
		
	], function( err ) {
		if (err)
			return context.done(err)
			
		var $client_log = {
			client: event.site + ' ' + event.session,
			timestamp: event.enhanced_time_start,
			type: 'field',
			field_name: event.field.name,			
			field_value: event.field.value			
		}
		
		var $form = {}
		var $rawform = {}
		if ($client.hasOwnProperty('rawform'))
			$rawform = $client.rawform
		
		if ($client.hasOwnProperty('form'))
			$form = $client.form
	
		$rawform[event.field.name] = event.field.value

		// calculate form using new site.fields
		if (event.hasOwnProperty('site_obj')) {
			var $newform = {}

			if (event.site_obj.fields.hasOwnProperty(event.field.name)) {
				if (event.site_obj.fields[event.field.name].hasOwnProperty('match') && (event.site_obj.fields[event.field.name].match !== null)) {
					$newform[event.site_obj.fields[event.field.name].match] = event.field.value
					$form[event.site_obj.fields[event.field.name].match] = event.field.value
					$client_log.field_name_local = event.site_obj.fields[event.field.name].match
				}
			}
			console.log("fields=", event.site_obj.fields)
			console.log("form=",$form)
			console.log("newform=",$newform)
			
		}

		var $update = {
				form: $form,
				rawform: $rawform
		}
		
		if ($client.hasOwnProperty('_month')) {
			$update._month = event._month
			$update._date  = event._date
		}
		
		async.parallel([
			function( cb ) {
				lambda.client_log($client_log,function(err) {
					if (err)
						console.log("client_log call error", $client_log )
					else
						console.log("client_log call OK", event.field.name, "=",event.field.value) 
					
					cb()
				})
			},
			function( cb ) {
				DynamoDB
					.table('clients')
					.where('site').eq( event.site )
					.where('session').eq( event.session )
					.update( $update, function( err ) {
						if (err) 
							return cb(err)
						
						console.log('client updated', $update)
						cb()
					})
			}
		], function( err ) {
			if (err)
				return context.done(err)
			
			context.done()
		})
	})
}

