var async = require('async')

var AWS = require('aws-sdk')
var $lambda = new AWS.Lambda({
    accessKeyId: "AKIAJQ4VVBL5RZOGD6IA",
    secretAccessKey: "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",
    region: "eu-west-1"
})

var $credentials = {
    "accessKeyId": "AKIAIDXKT6JCA43VEDUA",
    "secretAccessKey": "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",
    "region": "eu-west-1"
}
var DynamoDB = require('aws-dynamodb')($credentials)

module.exports = function(event, context ) {

  var $sites = []
  async.each(event.sites, function(item, cb) {
    DynamoDB
      .table('sites')
      .where('hash').eq(item)
      .select('hash','company_name', 'email', 'server', 'company_url')
      .get(function( err, data ) {
        if (err)
          return cb(err)

        $sites.push(data)
        cb()
      })

  }, function(err, data ) {
    if (err)
      return context.succeed({ success: false, err: err, event: event, sites: $sites })

      // get the template
  		DynamoDB
  			.table('campaigns')
  			.where('site').eq('ROOT')
  			.where('id').eq(72)
  			.get(function( err, data ) {
          if ( err )
  					return context.succeed({ success: false, errorMessage: "Could not get email template" })

          var $email = data.emails[ data.id ]
          // for each site replace into revenue ...

  				var $kv_sites = {}
  				for (var i in $sites) {
  					$kv_sites[$sites[i].hash] = $sites[i]
  				}

          var $reports_to_send = Object.keys($kv_sites).length
  				$max_time = 5000 // max is 60 but some were already consumed by the sites scan
  				$min_time = Math.round($max_time / $reports_to_send)
  				if ($min_time > 500 ) $min_time = 500
          $log = []

console.log("KV sites",$kv_sites)

          setInterval(function() {
  					if (Object.keys($kv_sites).length ===0) {
  						$log.push("reached end")
  						console.log("reached end")
              context.succeed({ success: true, log: $log.join("\n") })
  					}

  					// remove one item from object
  					$log.push(
                  "processing:" + JSON.stringify(Object.keys($kv_sites)[0],null,"\t") +
                  JSON.stringify($kv_sites[Object.keys($kv_sites)[0]],null,"\t") +
                  JSON.stringify(Object.keys($kv_sites).length - 1) + "left"
               )
               console.log(  "processing:" + JSON.stringify(Object.keys($kv_sites)[0],null,"\t") +
                  JSON.stringify($kv_sites[Object.keys($kv_sites)[0]],null,"\t") +
                  JSON.stringify(Object.keys($kv_sites).length - 1) + "left"
               )

            if (JSON.stringify(Object.keys($kv_sites).length - 1) > -1) {
                  $log.push("... Kv:" + $kv_sites[Object.keys($kv_sites)[0]].email)
                  console.log($kv_sites[Object.keys($kv_sites)[0]].email)

            //console.log("site " + $kv_sites[Object.keys($kv_sites)[0]])
  					$lambda.invoke({
  					   FunctionName: 'keptify-task-report-individual',
  				      InvocationType: 'Event',
  						Payload : JSON.stringify({
                  to: $kv_sites[Object.keys($kv_sites)[0]].email,
  						site: $kv_sites[Object.keys($kv_sites)[0]],
  						email: $email
  						})
  					}, function( err, data ) {
                    console.log("failed invoke report", err )
  					       $log.push("invoke report failed")
  					})
               }
  					delete $kv_sites[Object.keys($kv_sites)[0]]
  				}, $min_time )

  			})
      //

  })

}
