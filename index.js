require("./lib/common.js") // globally exports: redis, $lambda, DynamoDB

var express = require('express')
var app = express()
var cors = require('cors')
app.use(cors())
var bodyParser = require('body-parser')




var $handler_field    = require("./lib/field.js")
var $handler_live     = require("./lib/live.js")
var $handler_cart     = require("./lib/cart.js")
var $handler_pageview = require("./lib/pageview.js")


app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


app.get('/', function(req, res) { response.send('') })
app.get('/node/redis', function(req, res) {
	redis.get( req.param('key'), function(err, ret) {
		res.json({err: err, ret: ret })
	})
})


app.get('/node/live' , $handler_live )
app.get('/node/cart' , $handler_cart )
app.get('/node/field', $handler_field )
app.get('/node/pv'   , $handler_pageview )

// @todo: popup, popup_redirect, email_view, email_redirect, finish, etc


app.listen(app.get('port'), function() {
	console.log("Node app is running at localhost:" + app.get('port'))
})
