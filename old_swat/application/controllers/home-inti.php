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
			$this->template->set('title','Welcome user! | SI Angkutan DKP');
			$this->template->load('template','index');
		}
	}

	public function login(){
		$this->load->library('form_validation');

		$this->form_validation->set_rules('username','Username','trim|required');
		$this->form_validation->set_rules('password','Password', 'trim|required');
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		if($this->form_validation->run()==FALSE){
			$this->template->set('title','Login Form | SI Angkutan DKP');
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
				$this->template->set('title','Login Form | SI Angkutan DKP');
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
			$this->template->set('title','Login Form | SI Angkutan DKP');
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
				$this->template->set('title','Login Form | SI Angkutan DKP');
				$data['login_info'] = "Maaf, Username dan Password anda salah !";
				$this->template->load('template','index',$data);
			}
		}
	}

	public function monitoring(){
        $this->auth->restrict();
        $this->auth->cek_menu(78);

        $this->template->set('title','DASHBOARD | SI Angkutan DKP');
        $this->template->load('template_monitoring','monitoring/index');
    }

		public function monitoringtonase(){
	        $this->auth->restrict();
	        $this->auth->cek_menu(78);
	        $this->template->set('title','DASHBOARD MONITORING TONASE | SI Angkutan DKP');
	        $this->template->load('template_monitoring','monitoring/indextonase');
	    }

	public function monitoringtonaseswasta(){
			$this->auth->restrict();
			$this->auth->cek_menu(78);
			$this->template->set('title','DASHBOARD MONITORING TONASE SWASTA| SI Angkutan DKP');
			$this->template->load('template_monitoring','monitoring/indextonaseswasta');
	}
		public function monitoringkonsumsi(){
			$this->auth->restrict();
			$this->auth->cek_menu(78);

			$this->template->set('title','DASHBOARD MONITORING KONSUMSI BBM | SI Angkutan DKP');
			$this->template->load('template_monitoring','monitoring/indexkonsumsibbm');
		}

	public function logout(){
		if($this->auth->is_logged_in() == true)
		{
			$this->auth->do_logout();
		}
		redirect('home');
	}
}
