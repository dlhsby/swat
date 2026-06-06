<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kategorirute extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(75);
	
		$this->load->model('model_kategorirute');
		$data['all_kategorirute'] = $this->model_kategorirute->get_all_kategorirute();

		$this->template->set('title','Master Data Kategori Rute| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kategorirute/index',$data);
	}
	
	public function getkategorirute(){
		$this->auth->restrict();
		$this->auth->cek_menu(75);

		$this->load->model('model_kategorirute');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_kategorirute = $this->model_kategorirute->get_all_kategorirute();
		$result = $this->model_kategorirute->get_all_paging_sorting_kategorirute($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kategorirute->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createkategorirute(){
		$this->auth->restrict();
		$this->auth->cek_menu(75);
		
		$this->load->model('model_kategorirute');
		
		$data_kategorirute = array(
			'KATEGORIRUTE_NAMA' => $this->input->post('KATEGORIRUTE_NAMA')
		);
		$this->model_kategorirute->insert_kategorirute($data_kategorirute);
	
		$lastInsertedKategorirute = $this->model_kategorirute->get_last_inserted_kategorirute();
		$rows = $lastInsertedKategorirute->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekategorirute(){
		$this->auth->restrict();
		$this->auth->cek_menu(75);
		
		$this->load->model('model_kategorirute');
		$kategorirute_id = $this->input->post('KATEGORIRUTE_ID');
		
		$data_kategorirute = array(
			'KATEGORIRUTE_NAMA' => $this->input->post('KATEGORIRUTE_NAMA')
		);
		$this->model_kategorirute->update_kategorirute_by_id($kategorirute_id,$data_kategorirute);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekategorirute(){
		$this->auth->restrict();
		$this->auth->cek_menu(75);
		
		$this->load->model('model_kategorirute');
		$kategorirute_id = $this->input->post('KATEGORIRUTE_ID');
		
		$this->model_kategorirute->delete_kategorirute_by_id($kategorirute_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>