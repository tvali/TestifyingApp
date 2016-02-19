var uaparser = require('ua-parser')
module.exports = function( req, res ) {
	if (req.get('referer') === 'http://buttons-for-website.com')
		return res.end('//bfw')

	var $date = new Date()

	redis.incr("RQS_" + $date.toISOString().substr(0,19), function( err ) { redis.expire("RQS_" + $date.toISOString().substr(0,19), 60*60 )} )
	redis.incr("RQM_" + $date.toISOString().substr(0,16), function( err ) { redis.expire("RQS_" + $date.toISOString().substr(0,16), 60*60*24 )} )


	var $client = uaparser.parse(req.get('user-agent'))
	if ($client.device.family === 'Spider')
		return res.end('//spider')

	var $current_page = (req.get('referer') || '').replace(new RegExp('https://','g'),'').replace(new RegExp('http://','g'),'').replace(new RegExp('www.','g'),'').replace(new RegExp("\r",'g'),'').replace(/\s+\n/g ,"\n")

	if (!$current_page.length)
		return res.end('//current-page-not-detected')

	//$script_start = microtime(true);
	//$time_start = microtime_float();

	//mc_inc("RQ_".date('h:i:s'), 1 , 60*60 );
	//mc_inc("RQM_".date('h:i'), 1 , 60*60*24 );

	//mc_log($_SERVER['HTTP_REFERER']);

	//cloudfront-is-mobile-viewer, cloudfront-is-mobile-viewer, cloudfront-is-desktop-viewer,cloudfront-viewer-country
	//HTTP_X_FORWARDED_FOR = ip
	//HTTP_CLOUDFRONT_IS_MOBILE_VIEWER = false
	//HTTP_CLOUDFRONT_IS_TABLET_VIEWER
	//HTTP_CLOUDFRONT_IS_DESKTOP_VIEWER
	//HTTP_CLOUDFRONT_VIEWER_COUNTRY=RO

	var $site = req.param('site')
	var $sid = req.param('sid')

	var $ip = req.get('x-forwarded-for').split(',')[0]


	//$time_end = microtime_float();
	//$dynamosite = getDynamoSite($site);
	//$dynamoclient = getDynamoClient($site,$sid);

	if (typeof $site !== "string")
		return res.end('//!site')

	if (!$site.length)
		return res.end('//!site')

	var $dynamosite
	var $uniq = true
	var $site_lastload_recentupdate = null
	var $raw_site_lastload_recentupdate = null

	async.parallel([
		// check site lastload
		function(cb) {
			redis.get("SITEACTIVE_" + $site, function(err, ret) {
				$raw_site_lastload_recentupdate = {err: err, ret: ret }
				if (err) {
					$site_lastload_recentupdate = 'err'
					return cb()
				}

				$site_lastload_recentupdate = ( ret === null ? false : true )

				if ($site_lastload_recentupdate !== true ) {
					redis.set("SITEACTIVE_" + $site,"1")
					redis.expire("SITEACTIVE_"  + $site, 60 )
				}
				cb(null)
			})
		},

		// get the site
		function(cb) {
			DynamoDB
				.table('sites')
				.where('hash').eq($site)
				.get(function(err, data) {
					if (err) {
						res.end('//E-site')
						return cb(err)
					}
					if (!Object.keys(data).length) {
						res.end('//!site')
						return cb('err')
					}

					$dynamosite = data
					cb(null)
				})
		},

		// get the session, need for total cache
		function(cb) {
			cb(null)
		},

		// is uniq visitor ?
		function(cb) {
			redis.get("VISITOR_" + $site + "_" + $ip, function(err, ret) {
				if (err) {
					$uniq = false
					return cb(null)
				}

				$uniq = ret === null ? true : false

				if ($uniq ) {
					redis.set("VISITOR_" + $site + "_" + $ip,"1")
					redis.expire("VISITOR_" + $site + "_" + $ip, 60 * 60 * 24 )
				}
				cb(null)
			})
		}
	], function() {

		var $cart_pages = ($dynamosite['cart_pages'] || '').replace(new RegExp('https://','g'),'').replace(new RegExp('http://','g'),'').replace(new RegExp('www.','g'),'').replace(new RegExp("\r",'g'),'').replace(/\s+\n/g ,"\n").split("\n").filter(function(n){ return n != undefined })

		var $registration_pages = ($dynamosite['registration_pages'] || '').replace(new RegExp('https://','g'),'').replace(new RegExp('http://','g'),'').replace(new RegExp('www.','g'),'').replace(new RegExp("\r",'g'),'').replace(/\s+\n/g ,"\n").split("\n").filter(function(n){ return n != undefined })

		var $popup_pages = ($dynamosite['popup_pages'] || '').replace(new RegExp('https://','g'),'').replace(new RegExp('http://','g'),'').replace(new RegExp('www.','g'),'').replace(new RegExp("\r",'g'),'').replace(/\s+\n/g ,"\n").split("\n").filter(function(n){ return n != undefined })


		var $stat = {
			pv: 1,
			pv_m: req.get('http_cloudfront_is_mobile_viewer')  === "true" ? 1 : 0,
			pv_t: req.get('http_cloudfront_is_tablet_viewer')  === "true" ? 1 : 0,
			pv_d: req.get('http_cloudfront_is_desktop_viewer') === "true" ? 1 : 0,
		}
		$stat['pv_c_' + req.get('http_cloudfront_viewer_country') ] = 1
		$stat['pv_b_' + $client.ua.family ] = 1
		$stat['pv_o_' + $client.os.family ] = 1


		if ($uniq) {
			$stat = {
				pv: 1,
				pv_m: req.get('http_cloudfront_is_mobile_viewer')  === "true" ? 1 : 0,
				pv_t: req.get('http_cloudfront_is_tablet_viewer')  === "true" ? 1 : 0,
				pv_d: req.get('http_cloudfront_is_desktop_viewer') === "true" ? 1 : 0,

				vs: 1,
				pv_m: req.get('http_cloudfront_is_mobile_viewer')  === "true" ? 1 : 0,
				pv_t: req.get('http_cloudfront_is_tablet_viewer')  === "true" ? 1 : 0,
				pv_d: req.get('http_cloudfront_is_desktop_viewer') === "true" ? 1 : 0,
			}
			$stat['pv_c_' + req.get('http_cloudfront_viewer_country') ] = 1
			$stat['pv_b_' + $client.ua.family ] = 1
			$stat['pv_o_' + $client.os.family ] = 1


			$stat['vs_c_' + req.get('http_cloudfront_viewer_country') ] = 1
			$stat['vs_b_' + $client.ua.family ] = 1
			$stat['vs_o_' + $client.os.family ] = 1
		}

		$lambda.invoke({
			FunctionName: 'keptify-pageview-node',
			InvocationType: 'Event',
			Payload : JSON.stringify({
				site: $site,
				session: $sid,

				stats_inc: $stat,

				enhanced_time_start: new Date().getTime() * 10,
				enhanced_time: (new Date().getTime() * 10) + Math.round(Math.random() * 10),

				cart_enabled: $dynamosite['cart_enabled'] ? '1' : '0', // fix temporary it expects 0/1 from mysql

				_month: new Date().toISOString().substr(0,7),
				_date: new Date().toISOString().substr(0,10),

				update_site_last_load: $site_lastload_recentupdate === true ? false : true,

				client: {
					ua: req.get('user-agent'),
					browser: $client.ua.family || false,
					browser_version: $client.ua.major || false,
					os: $client.os.family || false,
					os_version: $client.os.major || false,
					device: $client.device.family || false,
					country: req.get('cloudfront-viewer-country') || 'XX',
					ip: $ip,
					current_page:  $current_page,
					referer: req.param('r') === "" ? false : req.param('r'),

					is_mobile:  req.get('http_cloudfront_is_mobile_viewer')  === "true" ? true : false,
					is_tablet:  req.get('http_cloudfront_is_tablet_viewer')  === "true" ? true : false,
					is_desktop: req.get('http_cloudfront_is_desktop_viewer') === "true" ? true : false,

					time_on_site: req.param('st') ? parseInt(req.param('st')) : false,
		//			//'dev_model' => array('S' => empty($ua->device->model) ? '(empty)' : $ua->device->model ),
		//			//'dev_vendor' => array('S' => empty($ua->device->vendor) ? '(empty)' : $ua->device->vendor ),
		//			//'dev_type' => array('S' => empty($ua->device->type) ? '(empty)' : $ua->device->type ),
				},
			})
		}, function( err, data ) {






		})



		res.jsonp({
			page_cart: $cart_pages.filter(function(n) { return wildcard(n, $current_page )  }).length ? true : false,
			page_registration: $registration_pages.filter(function(n) { return wildcard(n, $current_page )  }).length ? true : false,
			page_popup: $popup_pages.filter(function(n) { return wildcard(n, $current_page )  }).length ? true : false,
			popup_enabled: $dynamosite.popup_enabled ? true : false,
			cookie_days: $dynamosite.cookie_days,
			kv: {
				total: false,//isset($dynamoclient['total']) ? md5($dynamoclient['total']/100) : false,
				total_string: false // => isset($dynamoclient['total']) ? ($dynamoclient['total']/100) : false,
			},
			//client: $client,
			k: $date.toISOString().substr(0,19),
			latency: new Date().getTime() - $date.getTime(),
			lastload: $site_lastload_recentupdate,
			raw: $raw_site_lastload_recentupdate
		})

		// get total from memcache, set total in memcache in cart.php
		// crypto.createHash('md5').update(name).digest('hex')

		//mc_inc("LATENCY_".date('h:i:s'), round(microtime(true) - $script_start,3)*1000 , 60*60 );

		var $latency = new Date().getTime() - $date.getTime()

		redis.incrby("LAT_SEC_SUM_" + $date.toISOString().substr(0,19),$latency, function(err) {
			redis.expire("LAT_SEC_SUM_" + $date.toISOString().substr(0,19), 60*60 )
		})

		redis.get("LAT_SEC_MAX_" + $date.toISOString().substr(0,19), function( err, ret ) {
			redis.set("LAT_SEC_MAX_"    + $date.toISOString().substr(0,19), Math.max(ret, $latency ))
			redis.expire("LAT_SEC_MAX_" + $date.toISOString().substr(0,19), 60*60 )
		})

	})

}
