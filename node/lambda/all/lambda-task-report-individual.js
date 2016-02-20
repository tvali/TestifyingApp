var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA",
    "secretAccessKey": "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",
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)
var validator = require('validator')

var lawgs = require('lawgs')
var logger  = lawgs.getOrCreate('dynamodb-error')
logger.config({uploadMaxTimer: 50, uploadBatchSize: 1 })
var $tasks = 0

DynamoDB.on('error', function( operation, error, payload ) {
	logger.log('task-report', { operation: operation, payload: payload, error: error })
})

var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
	credentials: {
		accessKeyId: "AKIAJQ4VVBL5RZOGD6IA",
		secretAccessKey: "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",
	},
	region: "eu-west-1"
})

function time() {
	return Math.round(new Date().getTime() / 1000)
}
function base64_encode( $input ) {
	return new Buffer($input).toString('base64')
}
function dechex(number) {
  if (number < 0) {
    number = 0xFFFFFFFF + number + 1;
  }
  return parseInt(number, 10)
    .toString(16);
}

function sha1b(str) {
	var crypto = require('crypto')
	return crypto.createHash('sha1').update(str.toString("utf8")).digest('hex')
}

function sign($input, $ttl ) {
	if ($ttl === undefined || $ttl === null)
		$ttl = 0

	var $salt = 'w0pYIwbATxtayVBvMPuHB9VTNZ5IewZr'

	$input = base64_encode($input)

	var $expires = dechex(time() + $ttl);
	var $hash_input = $salt + $expires + $input;
	return $expires + '-0-' + base64_encode(sha1b($hash_input)).replace('+','').replace('/','').substr(0, 6) + '/' + $input;
}



exports.handler = function( event, context ) {

	//console.log(event)
	var $begin_date = '2015-03-'
	var $begin_date = new Date(new Date().setMonth(new Date().getMonth() - 1, 1 )).toISOString().substr(0,7) + '-' // Y-m-
	var $report_date_start = new Date(new Date().setMonth(new Date().getMonth() - 1, 1 )).toISOString().substr(0,10)
	var $report_date_end = new Date(new Date().setMonth(new Date().getMonth(), 1 ) - 1000 * 60 * 60 * 24 ).toISOString().substr(0,10)


	var $subject =  event.email.subject
	var $body = event.email.body

	var $subject = $subject.replace(new RegExp("COMPANY_NAME".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  event.site.company_name)
	var $subject = $subject.replace(new RegExp("COMPANY_WEBSITE".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  event.site.company_url)
	var $body = $body.replace(new RegExp("COMPANY_NAME".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  event.site.company_name)
	var $body = $body.replace(new RegExp("COMPANY_WEBSITE".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  event.site.company_url)
	var $body = $body.replace(new RegExp("SERVER".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  event.site.server)

	$body = $body.replace(new RegExp("REPORT_DATE_START".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $report_date_start )
	$body = $body.replace(new RegExp("REPORT_DATE_END".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $report_date_end )

	// REPORT_DATE_START, REPORT_DATE_END : February 1 - February 28

	// REPORT_VS, REPORT_AB_N, REPORT_AB_RATE

	// REPORT_REMARKETED REPORT_R_N, REPORT_R_A


	$body = $body.replace(new RegExp("AUTOLOGINURL".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
		'http://' +
		(event.site.server === 'cartbooster' ? 'cart-booster.com' : 'keptify.com') +
		'/account/login.php?token=' + sign( event.site.email , 60 * 60 * 24 * 40)
	)

	console.log(
		'http://' +
		(event.site.server === 'cartbooster' ? 'cart-booster.com' : 'keptify.com') +
		'/account/login.php?token=' + sign( event.site.email , 60 * 60 * 24 * 40)
	)


	// gather data
	$tasks++
	DynamoDB
		.table('stats')
		.select('vs','ab_n','ab_a', 'o_f_n','r_n','popup','e_s')
		.where('site').eq(event.site.hash)
		.where( 'date').begins_with( 'DAY ' + $begin_date )
		.query(function( err, data ) {
			if (err)
				return context.done(err)


			var $totals = {
				vs: 0,
				ab_n: 0,
				ab_a: 0,
				o_f_n: 0,
				r_n: 0,
				popup: 0,
				e_s: 0,
			}
			$revenue = {
				r_n: 0,
				r_a: 0,
			}
			for (var i in data) {
				if (data[i].hasOwnProperty('vs')) $totals.vs += data[i].vs
				if (data[i].hasOwnProperty('ab_n')) $totals.ab_n += data[i].ab_n
				if (data[i].hasOwnProperty('o_f_n')) $totals.o_f_n += data[i].o_f_n
				if (data[i].hasOwnProperty('r_n')) $totals.r_n += data[i].r_n
				if (data[i].hasOwnProperty('popup')) $totals.popup += data[i].popup
				if (data[i].hasOwnProperty('e_s')) $totals.e_s += data[i].e_s
			}
			if ($totals['ab_n'] + $totals['o_f_n'] - $totals['r_n'] <= 0) {
				$totals.ab_r = '-'
			} else {
				$totals.ab_r = Math.round(($totals['ab_n'] * 100)/($totals['ab_n'] + $totals['o_f_n'] - $totals['r_n'] ))
			}

			console.log("select from revenue where site", event.site.hash, " where date begins with ", $begin_date )
			DynamoDB
				.table('revenue')
				.where('site').eq( event.site.hash )
				.where('date').begins_with( $begin_date )
				.order_by('bySiteDate')
				//.limit(1000)
				.query(function( err, data ) {
					console.log(data)
					console.log($totals)
					console.log($revenue)
					if (err)
						return context.done(err)

					for (var i in data) {
						if ((data[i].status === 'PENDING' || data[i].status === 'VALID') && (data[i].order_id.substr(0,4) !== 'plan') ) {
							$revenue.r_n++
							$revenue.r_a += data[i].amount
						}
					}
					// also calculate $totals from revenue




					$body = $body.replace(new RegExp("REPORT_VS".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $totals.vs)
					$body = $body.replace(new RegExp("REPORT_AB_N".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $totals.ab_n)
					$body = $body.replace(new RegExp("REPORT_AB_RATE".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $totals.ab_r)

					$body = $body.replace(new RegExp("REPORT_R_N".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $revenue.r_n)
					$body = $body.replace(new RegExp("REPORT_R_A".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  Math.round($revenue.r_a / 100) )

					$body = $body.replace(new RegExp("REPORT_REMARKETED".replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),  $totals.popup + $totals.e_s )

					// REPORT_REMARKETED

					$lambda.invokeAsync({
						FunctionName: 'keptify-sendmail',
						//InvocationType: 'Event',
						InvokeArgs : JSON.stringify({
							site: event.site.hash,
							from: {
								name: event.site.server === 'cartbooster' ? 'Cart Booster' : 'Keptify',
								email: 'customer.care@cart-booster.com'
							},
							to: event.to,
							//to: event.site.email,
							subject: $subject,
							body: $body
						})
					}, function( err, data ) {
						if (err)
							console.log("Invoke failed", err)
						else
							console.log("Invoked sendmail")
						$tasks--
					})

				})



		})





	setInterval(function() {
		if ($tasks <= 0)
			context.done()
	},50)
}
