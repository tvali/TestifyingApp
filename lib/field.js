var uaparser = require('ua-parser')

module.exports = function( req, res ) {
	var $date = new Date()
	redis.incr("RQS_" + $date.toISOString().substr(0,19), function( err ) { redis.expire("RQS_" + $date.toISOString().substr(0,19), 60*60 )} )
	redis.incr("RQM_" + $date.toISOString().substr(0,16), function( err ) { redis.expire("RQS_" + $date.toISOString().substr(0,16), 60*60*24 )} )




	var $site = req.param('site')
	if (!$site)
		return res.end('E-site')

	var $sid = req.param('sid')
	if (!$sid)
		return res.end('E-sid')

	var $fname = req.param('f')
	if (!$fname)
		$fname = '(empty)'

	var $fvalue = req.param('v')
	if (!$fvalue)
		$fvalue = '(empty)'


	//var $client = uaparser.parse(req.get('user-agent'))
	//if ($client.device.family === 'Spider')
	//	return res.end('//spider')

	var $ispopup = (req.param('popup') === "1") // if get popup=1 => we increment popup_success in statistics
	var $stat = false;
	if ($ispopup) {
		$stat = {
			'popup_success': 1,
			//'popup_success_d_m' => $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']  == "true" ? 1 : 0,
			//'popup_success_d_t' => $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']  == "true" ? 1 : 0,
			//'popup_success_d_d' => $_SERVER['HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER'] == "true" ? 1 : 0,
			//'popup_success_c_' . $_SERVER['HTTP_CLOUDFRONT_VIEWER_COUNTRY'] => 1,
			//'popup_success_b_' . $ua->ua->family => 1,
			//'popup_success_o_' . $ua->os->family => 1,
		}
	}

	// get site by hash

	getDynamoSite( $site, function(err, $site_obj ) {
			if (err)
				return res.end('//E-site')

			if (!Object.keys($site_obj).length)
				return res.end('//E-site')

			var $lambda_args = {
				site: $site,
				session: $sid,
				stats_inc: $stat,

				site_obj: $site_obj,

				enhanced_time_start: new Date().getTime() * 10,
				enhanced_time: (new Date().getTime() * 10) + Math.round(Math.random() * 10),

				_month: new Date().toISOString().substr(0,7),
				_date: new Date().toISOString().substr(0,10),

				field: {
					name: $fname,
					value: $fvalue,
				}
			}
			$lambda.invoke({
				FunctionName: 'keptify-field-node',
				InvocationType: 'Event',
				Payload : JSON.stringify($lambda_args)
			}, function( err, data ) {
				var $latency = new Date().getTime() - $date.getTime()
				redis.incrby("LAT_SEC_SUM_" + $date.toISOString().substr(0,19),$latency, function(err) {
					redis.expire("LAT_SEC_SUM_" + $date.toISOString().substr(0,19), 60*60 )
				})
				redis.get("LAT_SEC_MAX_" + $date.toISOString().substr(0,19), function( err, ret ) {
					redis.set("LAT_SEC_MAX_"    + $date.toISOString().substr(0,19), Math.max(ret, $latency ))
					redis.expire("LAT_SEC_MAX_" + $date.toISOString().substr(0,19), 60*60 )
				})

			})

			return res.jsonp({success:true})
	})
}
