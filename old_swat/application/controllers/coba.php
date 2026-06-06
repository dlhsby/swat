<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Coba extends CI_Controller  {
	function __construct() {
		parent::__construct();
	}
	
	function index(){
		
		date_default_timezone_set('Asia/Jakarta');
		$data['waktuSekarang'] = (new \DateTime())->format('H:i:s');
		$data['tanggalHariIni'] = (new \DateTime())->format('Y-m-d');
		$this->load->view('coba',$data);
		
	}
}
?>