<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');
class Profil extends CI_Controller {
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		
		$this->load->library('form_validation');
		$this->form_validation->set_message('required', 'Kolom %s Harus Diisi');
		$this->form_validation->set_rules('namaPengguna','Nama Pengguna','trim|required');
		$this->form_validation->set_rules('usernamePengguna','Username Pengguna','trim|required');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		$idPengguna = $this->session->userdata('pengguna_id');	
		if($this->form_validation->run()==FALSE){
			
			$this->load->model('model_pengguna');
			$pengguna = $this->model_pengguna->get_pengguna_by_id($idPengguna);
			$data = "";
			
			if($pengguna->num_rows>0){
				$rowPengguna = $pengguna->row();
				$data['idPengguna'] = $rowPengguna->PENGGUNA_ID;
				$data['namaPengguna'] = $rowPengguna->PENGGUNA_NAMA;
				$data['usernamePengguna'] = $rowPengguna->PENGGUNA_USERNAME;
				$data['passwordPengguna'] = $rowPengguna->PENGGUNA_PASSWORD;
			}	
			$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
			$this->template->load('template','profil',$data);
		}
		else{
			$this->load->model('model_pengguna');
			
			$namaPengguna = $this->input->post('namaPengguna');
			$usernamePengguna = $this->input->post('usernamePengguna');
			$passwordPengguna = $this->input->post('passwordPengguna');
			$passwordLamaPengguna = $this->input->post('passwordLamaPengguna');
			$passwordBaruPengguna = $this->input->post('passwordBaruPengguna');
			$konfirmasiPasswordPengguna = $this->input->post('konfirmasiPasswordPengguna');
			
			$pengguna = $this->model_pengguna->get_pengguna_by_id($idPengguna);
			if($pengguna->num_rows>0){
				$rowPengguna = $pengguna->row();
				$recentIdPengguna = $rowPengguna->PENGGUNA_ID;
				$recentNamaPengguna = $rowPengguna->PENGGUNA_NAMA;
				$recentUsernamePengguna = $rowPengguna->PENGGUNA_USERNAME;
				$recentPasswordPengguna = $rowPengguna->PENGGUNA_PASSWORD;
				$data['idPengguna'] = $recentIdPengguna;
				$data['namaPengguna'] = $recentNamaPengguna;
				$data['usernamePengguna'] = $recentUsernamePengguna;
				$data['passwordPengguna'] = $recentPasswordPengguna;
				if($namaPengguna==""){
					$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
					$data['error_info'] = "Maaf, Nama Anda Tidak Boleh Kosong";
					$this->template->load('template','profil',$data);
				}
				else{
					if($usernamePengguna==""){
						$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
						$data['error_info'] = "Maaf, Username Anda Tidak Boleh Kosong";
						$this->template->load('template','profil',$data);
					}
					else{
						if($passwordLamaPengguna==""){
							$data_pengguna = array(
								'PENGGUNA_NAMA' => $namaPengguna,
								'PENGGUNA_USERNAME' => $usernamePengguna
							);
							$this->model_pengguna->update_pengguna_by_id($idPengguna,$data_pengguna);
							$this->session->set_userdata("pengguna_nama",$namaPengguna);
							$this->session->set_userdata("pengguna_username",$usernamePengguna);
							$penggunaAfterInsert = $this->model_pengguna->get_pengguna_by_id($idPengguna);
							$data = "";
							if($penggunaAfterInsert->num_rows>0){
								$rowPenggunaAfterInsert = $penggunaAfterInsert->row();
								$data['idPengguna'] = $rowPenggunaAfterInsert->PENGGUNA_ID;
								$data['namaPengguna'] = $rowPenggunaAfterInsert->PENGGUNA_NAMA;
								$data['usernamePengguna'] = $rowPenggunaAfterInsert->PENGGUNA_USERNAME;
								$data['passwordPengguna'] = $rowPenggunaAfterInsert->PENGGUNA_PASSWORD;
								
								$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
								$data['success_info'] = "Data Berhasil Disimpan";
								$this->template->load('template','profil',$data);
							}
						}
						else if($passwordLamaPengguna!="" && ($passwordBaruPengguna==""||$konfirmasiPasswordPengguna=="")){
							$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
							$data['error_info'] = "Maaf, Password Anda Tidak Boleh Kosong";
							$this->template->load('template','profil',$data);
						}
						else{
							if(Md5($passwordLamaPengguna)!=$recentPasswordPengguna){
								$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
								$data['error_info'] = "Maaf, Pasword Anda Salah";
								$this->template->load('template','profil',$data);
							}
							else if($passwordBaruPengguna !=$konfirmasiPasswordPengguna){
								$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
								$data['error_info'] = "Maaf, Pasword Baru Anda Tidak Sama";
								$this->template->load('template','profil',$data);
							}
							else{
								$data_pengguna = array(
									'PENGGUNA_NAMA' => $namaPengguna,
									'PENGGUNA_USERNAME' => $usernamePengguna,
									'PENGGUNA_PASSWORD' => Md5($passwordBaruPengguna)
								);
								$this->model_pengguna->update_pengguna_by_id($idPengguna,$data_pengguna);
								$this->session->set_userdata("pengguna_nama",$namaPengguna);
								$this->session->set_userdata("pengguna_username",$usernamePengguna);
								$penggunaAfterInsert = $this->model_pengguna->get_pengguna_by_id($idPengguna);
								$data = "";
								if($penggunaAfterInsert->num_rows>0){
									$rowPenggunaAfterInsert = $penggunaAfterInsert->row();
									$data['idPengguna'] = $rowPenggunaAfterInsert->PENGGUNA_ID;
									$data['namaPengguna'] = $rowPenggunaAfterInsert->PENGGUNA_NAMA;
									$data['usernamePengguna'] = $rowPenggunaAfterInsert->PENGGUNA_USERNAME;
									$data['passwordPengguna'] = $rowPenggunaAfterInsert->PENGGUNA_PASSWORD;
									
									$this->template->set('title','Profil Pengguna | SWAT DKP Surabaya');
									$data['success_info'] = "Data Berhasil Disimpan";
									$this->template->load('template','profil',$data);
								}
							}
						}
					}
				}
			}
		}
		
	}

	public function checkUsernameExistence(){
		$this->load->model('model_pengguna');
		$usernamePengguna = $_REQUEST['usernamePengguna'];
		$valid  = true;
		if($usernamePengguna == $this->session->userdata('pengguna_username')){
			$valid  = true;
		}
		else{
			$pengguna = $this->model_pengguna->get_validasipengguna_by_pengguna_username($usernamePengguna);	
			if($pengguna->num_rows>0){
		   		$rowPengguna = $pengguna->row();
		   		if($usernamePengguna == $rowPengguna->PENGGUNA_USERNAME){
		   			if($usernamePengguna == $this->session->userdata('pengguna_username')){
						$valid  = true;
					}else{
						$valid  = false;		
					}
				}
				else{
					$valid  = true;
				}
			}
			$pengguna->free_result();
		}	  
    	$arr    = array('usernamePengguna',$valid);
    	print json_encode($arr);
	}
	
	public function checkPassword(){
		$this->load->model('model_pengguna');
		$usernamePengguna = $this->session->userdata('pengguna_username');
		$passwordPengguna = $_REQUEST['passwordLamaPengguna'];
		$valid  = false;
		$pengguna = $this->model_pengguna->get_pengguna_by_pengguna_username_and_password($usernamePengguna,$passwordPengguna);
	   	if($pengguna->num_rows>0){
			$valid  = true;
		}
	   	$pengguna->free_result();
    	$arr    = array('passwordLamaPengguna',$valid);
    	print json_encode($arr);
	}
	
}