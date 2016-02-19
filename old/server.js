var http = require('http');
sendmail = require('sendmail')();
var webServer1=http.createServer(
 function (req, res) {
  res.writeHead(200, {
           'Content-Type': 'text/plain'});
	
	sendmail({
		from: 'no-reply@neoart.ro',
		to: 'tvaali@yahoo.com, vali_tirb@yahoo.com ',
		subject: 'test sendmail',
		content: 'Mail of test sendmail ',
	}, function(err, reply) {
		console.log(err && err.stack);
		console.dir(reply);
	});
	
  res.end('Hello World from server 1\n');
 });
var webServer2=http.createServer(
 function (req, res) {
  res.writeHead(200, {
            'Content-Type': 'text/plain'});
  res.end('Hello World from server 2\n');
});

webServer1.listen(9090, "127.0.0.1");
console.log('Server 1 running at http://127.0.0.1:1337/');

webServer2.listen(1338, "127.0.0.1");
console.log('Server 2 running at http://127.0.0.1:1338/');