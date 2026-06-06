<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Mastertrayek extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(99);
		
		$this->template->set('title','Master Data Trayek | SWAT DKP');
		$this->template->load('template','masterdata/mastertrayek/index');
	}
}