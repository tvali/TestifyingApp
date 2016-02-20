# node-rakuten
Rakuten Affiliate Network Reports


	var $raku_config = {
		// used to get a new Refresh Token
		username: 'uuuuuuuuu',
		password: '*********',
		sid: 1234567,
		TokenRequestAuthorization: 'Basic XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
		
		SecurityToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
	}
	var RakutenAffiliate = require('./lib/rakuten').Affiliate($rakuapp)


	RakutenAffiliate.requestAccessToken(function(err,token) {
		if (err)
			return console.log("could not get token",err)
		
		RakutenAffiliate.Report({
			bdate: '20150601', 
			edate: '20150617'
		}, function(err,data) {
			console.log(err,data)
		})
	})
