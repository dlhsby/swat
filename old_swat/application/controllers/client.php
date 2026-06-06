<?php
class Client extends CI_controller {

function __construct() {
    parent::__construct();
}

function index() {

    $this->load->library('Nusoap_lib');
    $this->nusoap_client = new nusoap_client(site_url('/Soapservers/'), false);
    $this->nusoap_client->soap_defencoding='UTF-8'; 
    $this->nusoap_client->decode_utf8 = true;
    $err = $this->nusoap_client->getError();
    if ($err){
        echo '<h2>Constructor error</h2><pre>' . $err . '</pre>';
    }
    $result1 = $this->nusoap_client->call('insertDB', array("L8004QP","WIGUNA TIMUR","2014-08-08 08:00:00","-1","80","kosong",'1793881'));
    echo($result1);


    // Check for a fault
    if ($this->nusoap_client->fault) {
        echo '<h2>Fault</h2><pre>';
        print_r($result1);
        echo '</pre>';
    } else {
        // Check for errors
        $err = $this->nusoap_client->getError();
        if ($err) {
            // Display the error
            echo '<h2>Error</h2><pre>' . $err . '</pre>';
        } else {
            // Display the result
            echo '<h2>Result</h2><pre>';
            print_r($result1);
        echo '</pre>';
        }
    }
}
}
?>