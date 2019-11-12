<?php
function createJSONResponse($type, $message){
	$response = new \stdClass();
	$response->type = $type;
	$response->message = $message;
	$response = json_encode($response);	
	echo $response;
	exit();
}
?>
