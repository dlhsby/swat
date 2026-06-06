<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class Home extends CI_Controller {
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		if($this->auth->is_logged_in()==FALSE){
			$this->login();
		}
		else{
			$this->template->set('title','Welcome user! | SWAT DKP Surabaya');
			$this->template->load('template','index');	
		}
	}
	
	public function login(){
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('username','Username','trim|required');
		$this->form_validation->set_rules('password','Password', 'trim|required');
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		if($this->form_validation->run()==FALSE){
			$this->template->set('title','Login Form | SWAT DKP Surabaya');
			$this->template->load('template','index');
		}
		else{
			$username = $this->input->post('username');
			$password = $this->input->post('password');
			$success = $this->auth->do_login($username,$password);
			if($success)
			{
				redirect('home/index');
			}
			else{
				$this->template->set('title','Login Form | SWAT DKP Surabaya');
				$data['login_info'] = "Maaf, Username dan Password anda salah !";
				$this->template->load('template','index',$data);
			}
		}
	}
	
	public function form_login(){
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('username','Username','trim|required');
		$this->form_validation->set_rules('password','Password', 'trim|required');
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		if($this->form_validation->run()==FALSE){
			$this->template->set('title','Login Form | SWAT DKP Surabaya');
			$this->template->load('template','form_login');
		}
		else{
			$username = $this->input->post('username');
			$password = $this->input->post('password');
			$success = $this->auth->do_login($username,$password);
			if($success)
			{
				redirect('home/index');
			}
			else{
				$this->template->set('title','Login Form | SWAT DKP Surabaya');
				$data['login_info'] = "Maaf, Username dan Password anda salah !";
				$this->template->load('template','index',$data);
			}
		}
	}
	
	public function monitoring(){
        $this->auth->restrict();
        $this->auth->cek_menu(78);
        
        //$this->load('model_tonase');
        $this->load->model('model_tonase');
        
        $tahun = '2014';
        $tonaseTahun = $this->model_tonase->get_tonase_by_tahun($tahun);
        $totalTonaseTahun = 0;
        if ($tonaseTahun->num_rows() > 0){
			$rowTonaseTahun = $tonaseTahun->row();
			$totalTonaseTahun = $rowTonaseTahun->TOTALTONASE;
		}
        
		$data['tonase2014'] = $totalTonaseTahun;
        $this->template->set('title','DASHBOARD | SWAT DKP Surabaya');
        $this->template->load('template_monitoring','monitoring/index',$data);
    }
	
	public function logout(){
		if($this->auth->is_logged_in() == true)
		{
			$this->auth->do_logout();
		}
		redirect('home');
	}
}