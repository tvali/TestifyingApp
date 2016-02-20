process.env.TZ = 'UTC'


var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA", 
    "secretAccessKey": "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", 
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

var AWS = require('aws-sdk')
var s3 = new AWS.S3({
    "accessKeyId": "AKIAJKZDLCDWFNRVDKVQ", 
    "secretAccessKey": "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", 
    "region": 'eu-west-1'
})										

						

var zlib = require('zlib')
var fs = require('fs')

var Mustache = require('mustache')
exports.handler = function( event, context ) {
	// event.site

	DynamoDB
		.table('sites')
		.where('hash').eq(event.site)
		.consistentRead()
		.get(function(err, $site) {
			if (err) {
				return context.done(err)
			}
			
			if (!$site.hasOwnProperty('hash')) {
				return context.done({errorMessage: 'site-not-found'})
			}

			var $jquery = fs.readFileSync("storage/jquery.js", {encoding: 'utf8'} )
			
			if(event.site == "53ae80e257ab9") { //if MONPLATIN
				var $script = fs.readFileSync("storage/cloudfront-script-monplatin.js", {encoding: 'utf8'} );
				console.log ("Save Monplatin !! ");
			}
			else{
				var $script = fs.readFileSync("storage/cloudfront-script.js", {encoding: 'utf8'} )
			}
			if ($site.hasOwnProperty('script_disabled') && $site.script_disabled) {
				$jquery = ''
				var $script = fs.readFileSync("storage/cloudfront-script-disabled.js", {encoding: 'utf8'} )
			}

			//raw.pipe(zlib.createGzip()).pipe(response);
			
			console.log($site.fields)
			if (!$site.hasOwnProperty('fields'))
				$site.fields = {}
			
			$mask_fields = {}
			for (var $fname in $site.fields ) {
				if ($site.fields[$fname]['mask'])
					$mask_fields[$fname] = 'mask';

				if ($site.fields[$fname]['ignore'])
					$mask_fields[$fname] = 'ignore';
			}

			var $finish_pages = ($site['finish_pages'] || '')
				.replace(new RegExp('https://','g'),'')
				.replace(new RegExp('http://','g'),'')
				.replace(new RegExp('www.','g'),'')
				.replace(new RegExp("\r",'g'),'')
				.replace(/\s+\n/g ,"\n")
				.split("\n").filter(function(n){ return n != undefined })
		
			var $text_script = Mustache.render($script, { 
				site: $site,
				mask_fields: JSON.stringify($mask_fields),
				confirmation_pages: JSON.stringify($finish_pages),
				
				function_finish: $site.hasOwnProperty('finish_function') ? ($site['finish_function'].trim() == '' ? "return null;" : $site['finish_function']) : "return null;",
			})
			
			/*
			if (isset($dynamo_customer_arr['Item'])) {
					$dynamocustomer = normalizeItem($dynamo_customer_arr['Item']);
					if ($dynamocustomer['feedback_enabled']) {
						$feedback = "
							_cart_booster.feedback(".json_encode(array(
								"button" => $dynamocustomer['feedback_button'],
								"position" => $dynamocustomer['feedback_position'],
								"closeBtn" => $dynamocustomer['feedback_button_close'],
								"form" => $dynamocustomer['feedback_form'],

								"style" => $dynamocustomer['feedback_style'],
								"input_style" => $dynamocustomer['feedback_input_style'],
								"textarea_style" => $dynamocustomer['feedback_textarea_style'],
								"submit_style" => $dynamocustomer['feedback_submit_style'],

							)).")
						";
						
						$script .= $feedback;
					}
					
			}*/			
			
			zlib.gzip(new Buffer($jquery + $text_script, 'utf-8'), function (err, result) { 
				if (err) {
					return context.done(err)
				}
				s3.putObject({
					Bucket: 'app.cart-booster.com',
					//Key: 'test/' + event.site,
					Key: event.site,
					Body: result,
					ACL: 'public-read',
					ContentType: 'text/javascript',
					ContentEncoding: 'gzip'
				}, function(err, data) {
					if (err) {
						return context.done(err)
					}
					context.done()
				})
			})
		})

}
