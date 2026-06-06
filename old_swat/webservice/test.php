<?php
require_once "nusoap.php";
$client = new nusoap_client("http://192.168.226.1/webservice/server.php");
 
$error = $client->getError();
if ($error) {
    echo "<h2>Constructor error</h2><pre>" . $error . "</pre>";
}
$param = array('id' => "7980001");
$result = $client->call("getKitir", $param);
 
if ($client->fault) {
    echo "<h2>Fault</h2><pre>";
    print_r($result);
    echo "</pre>";
}
else {
    $error = $client->getError();
    if ($error) {
        echo "<h2>Error</h2><pre>" . $error . "</pre>";
    }
    else {
        echo "<h2>Books</h2><pre>";
		echo $result;
		
        echo "</pre>";
    }
}

?>