
Mumail = require '../mumail'

mumail = new Mumail
	templatePath: './templates/'
	from: 'noreply@localhost'

mumail.on 'done', ->
	console.log 'mail sent'

mumail.on 'error', (error)->
	console.log error

mumail.send
	to: "user@somehost.com"
	subject: "Welcome!"
	template: "welcome"
	data:
		username: 'unique-username'

mumail.render "welcome", username: 'unique-username', (html)->
	console.log html
