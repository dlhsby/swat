<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kategorispot extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(74);
	
		$this->load->model('model_kategorispot');
		$data['all_kategorispot'] = $this->model_kategorispot->get_all_kategorispot();

		$this->template->set('title','Master Data Kategori Spot| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kategorispot/index',$data);
	}
	
	public function getkategorispot(){
		$this->auth->restrict();
		$this->auth->cek_menu(74);

		$this->load->model('model_kategorispot');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_kategorispot = $this->model_kategorispot->get_all_kategorispot();
		$result = $this->model_kategorispot->get_all_paging_sorting_kategorispot($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kategorispot->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createkategorispot(){
		$this->auth->restrict();
		$this->auth->cek_menu(74);
		
		$this->load->model('model_kategorispot');
		
		$data_kategorispot = array(
			'KATEGORISPOT_NAMA' => $this->input->post('KATEGORISPOT_NAMA')
		);
		$this->model_kategorispot->insert_kategorispot($data_kategorispot);
	
		$lastInsertedKategorispot = $this->model_kategorispot->get_last_inserted_kategorispot();
		$rows = $lastInsertedKategorispot->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekategorispot(){
		$this->auth->restrict();
		$this->auth->cek_menu(74);
		
		$this->load->model('model_kategorispot');
		$kategorispot_id = $this->input->post('KATEGORISPOT_ID');
		
		$data_kategorispot = array(
			'KATEGORISPOT_NAMA' => $this->input->post('KATEGORISPOT_NAMA')
		);
		$this->model_kategorispot->update_kategorispot_by_id($kategorispot_id,$data_kategorispot);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekategorispot(){
		$this->auth->restrict();
		$this->auth->cek_menu(74);
		
		$this->load->model('model_kategorispot');
		$kategorispot_id = $this->input->post('KATEGORISPOT_ID');
		
		$this->model_kategorispot->delete_kategorispot_by_id($kategorispot_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>