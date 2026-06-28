<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
/**
 * Auth library
 *
 * @author  Anggy Trisnawan
 */
 class Auth {
 	var $CI = NULL;
   	function __construct(){
      // get CI's object
		$this->CI =& get_instance();
   	}
	
	//untuk validasi login
	function do_login($username, $password){
		$this->CI->db->from('pengguna');
		$this->CI->db->where('pengguna_username',$username);
		$this->CI->db->where('pengguna_password=MD5("'.$password.'")','',FALSE);
		$result = $this->CI->db->get();
		if($result->num_rows()==0)
		{
			//username dan password tsb tidak ada
			return FALSE;
		}
		else{
			//ada, ambil informasi Usermodel
			$userdata = $result->row();
			$session_data = array(
				'pengguna_id' => $userdata->PENGGUNA_ID,
				'pengguna_nama' => $userdata->PENGGUNA_NAMA,
				'pengguna_username' => $userdata->PENGGUNA_USERNAME,
				'pengguna_hakakses_id' => $userdata->HAKAKSES_ID,
			);
			$this->CI->session->set_userdata($session_data);
			return TRUE;
		}
	}

	function do_logout(){
		$this->CI->session->sess_destroy(); 
	}

	function is_logged_in(){
		if($this->CI->session->userdata('pengguna_id') == ''){
			return FALSE;
		}
		return TRUE;
	}
	
	//validasi di tiap halaman
	function restrict(){
		if($this->is_logged_in()==FALSE){
			redirect('home');
		}
	}

	function cek_menu($menu_id){
		$this->CI->load->model('model_hakakses');
		$hakakses_id = $this->CI->session->userdata('pengguna_hakakses_id');		
		if($this->CI->model_hakakses->get_hakAksesForMenu($menu_id,$hakakses_id)==FALSE){
			redirect('home');
		}
		
	}
	
	function get_session_pengguna_id(){
		$pengguna_id = $this->CI->session->userdata('pengguna_id');
		return $pengguna_id;
	}
 }
?>