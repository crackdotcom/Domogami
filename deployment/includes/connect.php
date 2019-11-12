<?php
$HOST 	= /*DATABASEHOST*/;
$DBUSER = /*DATABASEUSER*/;
$DBPASS = /*DATABASEPASS*/;
$DBNAME	= /*DATABASENAME*/;

if((isset($debugDatabaseID)) && $debugDatabaseID != ''){
	$DBNAME.='_'.$debugDatabaseID;
}
    $mysqli = new mysqli($HOST, $DBUSER, $DBPASS, $DBNAME);

    if ($mysqli->connect_error) {
        die('Connect Error (' . $mysqli->connect_errno . ') '
                . $mysqli->connect_error);
    }

    if (mysqli_connect_error()) {
        die('Connect Error (' . mysqli_connect_errno() . ') '
                . mysqli_connect_error());
    } //LEGACY SUPPORT
?>