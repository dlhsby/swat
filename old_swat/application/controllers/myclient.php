<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class Myclient extends CI_Controller  {

    public function __construct() {
        parent::__construct(); 
        $this->load->library("Nusoap_lib");
    }
    
   	public function index()
	{
		$wsdl = 'http://'.$_SERVER['HTTP_HOST'].'/swat/index.php/myserver/?wsdl';
	    $client = new nusoap_client($wsdl,true);
	    $err = $client->getError();
		if ($err) {
			var_dump($err);
		}
		// Call the SOAP method
		$result = $client->call('addnumbers', array('a' => 'Ghaida'));
		var_dump($result);
	}
	
	public function getpembuanganterverifikasi()
	{
		$tanggal = "2015-08-18";
		$wsdl = 'http://'.$_SERVER['HTTP_HOST'].'/swat/index.php/myserver/?wsdl';
	    $client = new nusoap_client($wsdl,true);
	    $err = $client->getError();
		if ($err) {
			var_dump($err);
		}
		// Call the SOAP method
		//$result = array();
		$result = $client->call('getpembuanganterverifikasi', array('tanggal' => $tanggal));
		var_dump($result);
	}

	public function getpembuanganterverifikasiwithnopol()
	{
		$tanggal = "2015-08-18";
		$nopol = "B9206UCF";
		$wsdl = 'http://'.$_SERVER['HTTP_HOST'].'/swat/index.php/myserver/?wsdl';
	    $client = new nusoap_client($wsdl,true);
	    $err = $client->getError();
		if ($err) {
			var_dump($err);
		}
		// Call the SOAP method
		//$result = array();
		$result = $client->call('getpembuanganterverifikasiwithnopol', array('tanggal' => $tanggal, 'nopol' => $nopol));
		var_dump($result);
	}
}
?>