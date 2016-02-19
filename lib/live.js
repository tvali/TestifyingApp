
module.exports = function( req, res ) {
	var $byminute = []
	for (var $i = 0;$i<=60*12;$i++) {
		var $timestamp = (parseInt(new Date().getTime() / 1000) - ($i * 60)) * 1000;

		(function($i,$timestamp) {
			redis.get("RQM_" + new Date($timestamp ).toISOString().substr(0,16), function(err, ret) {
				if (!err)
					$byminute[$i] = [ $timestamp , ret === null ? 0 : parseInt(ret) ]
			})

		})($i,$timestamp)
	}

	var $data = []
	for (var $i = 0;$i<=180;$i++) {
		var $timestamp = (parseInt(new Date().getTime() / 1000) - $i) * 1000;

		(function($i,$timestamp) {
			redis.get("RQS_" + new Date( $timestamp ).toISOString().substr(0,19), function(err, ret) {
				if (!err)
					$data[180-$i] = [ ret === null ? 0 : parseInt(ret) ]
			})

		})($i,$timestamp)
	}

	var $latency =[]
	for ($i = 0;$i<=180 * 5;$i++) {
		var $timestamp = (parseInt(new Date().getTime() / 1000) - $i) * 1000;

		(function($i,$timestamp) {
			redis.get("LAT_SEC_SUM_" + new Date( $timestamp ).toISOString().substr(0,19), function(err, ret) {
				if (!err)
					$latency[180-$i] = [ $timestamp , ret === null ? 0 : parseInt(ret) ]
			})

		})($i,$timestamp)
	}
	var $latency_max =[]
	for ($i = 0;$i<=180;$i++) {
		var $timestamp = (parseInt(new Date().getTime() / 1000) - $i) * 1000;

		(function($i,$timestamp) {
			redis.get("LAT_SEC_MAX_" + new Date( $timestamp ).toISOString().substr(0,19), function(err, ret) {
				if (!err)
					$latency_max[180-$i] = [ $timestamp , ret === null ? 0 : parseInt(ret) ]
			})

		})($i,$timestamp)
	}
	$log = '' // $mc->get('LOG');

	setTimeout(function() {
		res.jsonp({
			live: $data,
			liveminute: $byminute,
			latency: $latency,
			latency_max: $latency_max,
			log: $log,
			debug: '', // => $mc->get('DEBUG')
		})
	}, 200)
}
