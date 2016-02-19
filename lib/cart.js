var uaparser = require('ua-parser')

module.exports = function( req, res ) {
	if (req.get('referer') === 'http://buttons-for-website.com')
		return res.end('//bfw')

	var $date = new Date()

	var $client = uaparser.parse(req.get('user-agent'))
	if ($client.device.family === 'Spider')
		return res.end('//spider')

	var $site = req.param('site')
	var $sid = req.param('sid')
	var $total = parseFloat(req.param('t')) == req.param('t') ? (parseFloat(req.param('t')) * 100) : false
	var $ip = req.get('x-forwarded-for').split(',')[0]

	if (typeof $site !== "string")
		return res.end('//!site')

	if (!$site.length)
		return res.end('//!site')

	if ($total === false)
		return res.end('//!total')

		$lambda.invoke({
			FunctionName: 'keptify-cart-node',
			InvocationType: 'Event',
			Payload : JSON.stringify({
				site: $site,
				session: $sid,

				stats_inc: false,

				enhanced_time_start: new Date().getTime() * 10,
				enhanced_time: (new Date().getTime() * 10) + Math.round(Math.random() * 10),

				_month: new Date().toISOString().substr(0,7),
				_date: new Date().toISOString().replace('T',' ').substr(0,19),

				client: {
					//ua: req.get('user-agent'),
					//browser: $client.ua.family || false,
					//browser_version: $client.ua.major || false,
					//os: $client.os.family || false,
					//os_version: $client.os.major || false,
					//device: $client.device.family || false,
					//country: req.get('cloudfront-viewer-country') || 'XX',
					//ip: $ip,
					//current_page:  $current_page,
					//referer: req.param('r') === "" ? false : req.param('r'),

					//is_mobile:  req.get('http_cloudfront_is_mobile_viewer')  === "true" ? true : false,
					//is_tablet:  req.get('http_cloudfront_is_tablet_viewer')  === "true" ? true : false,
					//is_desktop: req.get('http_cloudfront_is_desktop_viewer') === "true" ? true : false,

					//time_on_site: req.param('st') ? parseInt(req.param('st')) : false,
		//			//'dev_model' => array('S' => empty($ua->device->model) ? '(empty)' : $ua->device->model ),
		//			//'dev_vendor' => array('S' => empty($ua->device->vendor) ? '(empty)' : $ua->device->vendor ),
		//			//'dev_type' => array('S' => empty($ua->device->type) ? '(empty)' : $ua->device->type ),
				},
				cart: {
					total: $total
				}
			})
		}, function( err, data ) {
		})

		res.jsonp(null)

		var $latency = new Date().getTime() - $date.getTime()
		redis.incrby("LAT_SEC_SUM_" + $date.toISOString().substr(0,19),$latency, function(err) {
			redis.expire("LAT_SEC_SUM_" + $date.toISOString().substr(0,19), 60*60 )
		})
		redis.get("LAT_SEC_MAX_" + $date.toISOString().substr(0,19), function( err, ret ) {
			redis.set("LAT_SEC_MAX_"    + $date.toISOString().substr(0,19), Math.max(ret, $latency ))
			redis.expire("LAT_SEC_MAX_" + $date.toISOString().substr(0,19), 60*60 )
		})
}
