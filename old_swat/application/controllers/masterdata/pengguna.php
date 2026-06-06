<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Pengguna extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(62);
	
		$this->load->model('model_pengguna');
		$data['all_pengguna'] = $this->model_pengguna->get_all_pengguna_with_hakakses();

		$this->template->set('title','Master Data Pengguna | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/pengguna/index',$data);
	}
	
	public function getpengguna(){
		$this->auth->restrict();
		$this->auth->cek_menu(62);

		$this->load->model('model_pengguna');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_pengguna = $this->model_pengguna->get_all_pengguna();
		$result = $this->model_pengguna->get_all_paging_sorting_pengguna($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_pengguna->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function gethakakses(){
		$this->load->model('model_hakakses');
		
		$all_hakakses = $this->model_hakakses->get_all_hakakses();
		
		$rows = array();
		if($all_hakakses->num_rows()>0){
			foreach($all_hakakses->result_array() as $hakakses){
				$dummy = array();
				$dummy["DisplayText"] = $hakakses["HAKAKSES_NAMA"];
			    $dummy["Value"] = $hakakses["HAKAKSES_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createpengguna(){
		$this->auth->restrict();
		$this->auth->cek_menu(62);
		
		$this->load->model('model_pengguna');
		
		$data_pengguna = array(
			'PENGGUNA_FOTO' => $this->input->post('PENGGUNA_FOTO'),
			'PENGGUNA_NAMA' => $this->input->post('PENGGUNA_NAMA'),
			'HAKAKSES_ID' => $this->input->post('HAKAKSES_ID'),
			'PENGGUNA_USERNAME' => $this->input->post('PENGGUNA_USERNAME'),
			'PENGGUNA_PASSWORD' => md5($this->input->post('PENGGUNA_PASSWORD'))
		);
		$this->model_pengguna->insert_pengguna($data_pengguna);
	
		$lastInsertedPengguna = $this->model_pengguna->get_last_inserted_pengguna();
		$rows = $lastInsertedPengguna->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatepengguna(){
		$this->auth->restrict();
		$this->auth->cek_menu(62);
		
		$this->load->model('model_pengguna');
		$pengguna_id = $this->input->post('PENGGUNA_ID');
		$data_pengguna = array(
			'PENGGUNA_FOTO' => $this->input->post('PENGGUNA_FOTO'),
			'PENGGUNA_NAMA' => $this->input->post('PENGGUNA_NAMA'),
			'HAKAKSES_ID' => $this->input->post('HAKAKSES_ID'),
			'PENGGUNA_USERNAME' => $this->input->post('PENGGUNA_USERNAME')/*,
			'PENGGUNA_PASSWORD' => md5($this->input->post('PENGGUNA_PASSWORD'))*/
		);
		
		$this->model_pengguna->update_pengguna_by_id($pengguna_id,$data_pengguna);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletepengguna(){
		$this->auth->restrict();
		$this->auth->cek_menu(62);
		
		$this->load->model('model_pengguna');
		$pengguna_id = $this->input->post('PENGGUNA_ID');
		
		$this->model_pengguna->delete_pengguna_by_id($pengguna_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>