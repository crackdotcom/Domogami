<?php
function getDySDR($path, $backSlashes = false){
    if($backSlashes){
        $path = str_replace("\\", "/", $path);
    }
    $dir = explode("/", $path);
    if($dir[count($dir)-1] == "public_html"){
        return "./";
    }
    $ss = '';
     for($i = count($dir)-1; $i>=0; $i--){
         if($dir[$i] == "public_html"){
            return $ss;
         }
     $ss.='../';
     }
}
if(isset($replacePath) && $replacePath != ''){
$sdr = getDySDR($replacePath, true);
$replacePath = "";
}else{
$sdr = getDySDR($_SERVER['DOCUMENT_ROOT']);
}
if(!isset($userType)){
session_start();
	if(
	!isset($_SESSION["userName"]) ||
	!isset($_SESSION["loginTimeStamp"])
	){
		$loggedIn = false;
		unset($_SESSION["userName"]);
		unset($_SESSION["loginTimeStamp"]);
		//UNSET ENVIROMENT VARS
		$userType = -1;
	}else{	
		$loggedIn = true;
		//SET ENVIROMENT VARS
	}
}
?>
