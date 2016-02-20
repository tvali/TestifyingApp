<?php
    $body = '';
    while (FALSE !== ($line = fgets(STDIN))) {
	$body.= $line;
    }

    $event = json_decode($body,true);
    
    // event
	//	from
	//		email
	//		name
    //	to
	//	subject
	//	body
	
    var_dump($event);
	
	/*
		ireland credentials
		AKIAJEKC3ZSZUPVRSHDQ
		Aj93aJoJJbN2P5MHRmz11lRMgPQqZbclYA5bQTPqEqHs
		tls://email-smtp.eu-west-1.amazonaws.com
		noreply@keptify.com
		
		us credentials
		AKIAJVCWFHYQL4A223AA
		AnEDGQ+jC4xSR9PHpJR16lRGTwtxaFCjB5MLtjdvb8/r
		tls://email-smtp.us-west-2.amazonaws.com
		customer.care@cart-booster.com
	*/
	
	require $base . 'swiftmailer/swift_required.php';
	$transport = Swift_SmtpTransport::newInstance('tls://email-smtp.eu-west-1.amazonaws.com', 465)
	  ->setUsername('AKIAJEKC3ZSZUPVRSHDQ')
	  ->setPassword('Aj93aJoJJbN2P5MHRmz11lRMgPQqZbclYA5bQTPqEqHs');	
	
	$mailer = Swift_Mailer::newInstance($transport);
	$message = Swift_Message::newInstance($event['subject'])
		->setFrom(array($event['from']['email'] => $event['from']['name']))
		->setTo(array($event['to']))
		->setBody($event['body'], 'text/html' )
	;

	//$headers = $message->getHeaders();
	//$headers->addTextHeader('List-Unsubscribe', '<' . $unsubscribe_link . '>');
	//List-Subscribe: <mailto:>
	//List-Unsubscribe <http://>
	$result = $mailer->send($message);
	var_dump($result);
?>