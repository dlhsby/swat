<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Spot extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(72);
	
		$this->load->model('model_spot');
		$this->load->model('model_kategorispot');
		$data['all_spot'] = $this->model_spot->get_all_spot();
		$data['all_kategorispot'] = $this->model_kategorispot->get_all_kategorispot();
		$this->template->set('title','Master Data Spot | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/spot/index',$data);
	}
	
	public function getspot(){
		$this->auth->restrict();
		$this->auth->cek_menu(72);

		$this->load->model('model_spot');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_spot = $this->model_spot->get_all_spot();
		$result = $this->model_spot->get_all_paging_sorting_spot($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_spot->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getspotbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(72);

		$this->load->model('model_spot');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$namaSpot = $this->input->post('namaSpot');
		$kategoriSpot = $this->input->post('kategoriSpot');
		
		$all_spot = $this->model_spot->get_all_spot_by_filter($namaSpot,$kategoriSpot);
		$result = $this->model_spot->get_all_paging_sorting_spot_by_filter($namaSpot,$kategoriSpot,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_spot->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getkategorispot(){
		$this->load->model('model_kategorispot');
		
		$all_kategorispot = $this->model_kategorispot->get_all_kategorispot();
		
		$rows = array();
		if($all_kategorispot->num_rows()>0){
			foreach($all_kategorispot->result_array() as $kategorispot){
				$dummy = array();
				$dummy["DisplayText"] = $kategorispot["KATEGORISPOT_NAMA"];
			    $dummy["Value"] = $kategorispot["KATEGORISPOT_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createspot(){
		$this->auth->restrict();
		$this->auth->cek_menu(72);
		
		$this->load->model('model_spot');
		
		$data_spot = array(
			'KATEGORISPOT_ID' => $this->input->post('KATEGORISPOT_ID'),
			'SPOT_NAMA' => $this->input->post('SPOT_NAMA'),
			'SPOT_ALAMAT' => $this->input->post('SPOT_ALAMAT'),
			'SPOT_LATITUDE' => $this->input->post('SPOT_LATITUDE'),
			'SPOT_LONGITUDE' => $this->input->post('SPOT_LONGITUDE'),
			'SPOT_FOTO' => $this->input->post('SPOT_FOTO')
		);
		$this->model_spot->insert_spot($data_spot);
	
		$lastInsertedSpot = $this->model_spot->get_last_inserted_spot();
		$rows = $lastInsertedSpot->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatespot(){
		$this->auth->restrict();
		$this->auth->cek_menu(72);
		
		$this->load->model('model_spot');
		$spot_id = $this->input->post('SPOT_ID');
		
		$data_spot = array(
			'KATEGORISPOT_ID' => $this->input->post('KATEGORISPOT_ID'),
			'SPOT_NAMA' => $this->input->post('SPOT_NAMA'),
			'SPOT_ALAMAT' => $this->input->post('SPOT_ALAMAT'),
			'SPOT_LATITUDE' => $this->input->post('SPOT_LATITUDE'),
			'SPOT_LONGITUDE' => $this->input->post('SPOT_LONGITUDE'),
			'SPOT_FOTO' => $this->input->post('SPOT_FOTO')
		);
		$this->model_spot->update_spot_by_id($spot_id,$data_spot);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletespot(){
		$this->auth->restrict();
		$this->auth->cek_menu(72);
		
		$this->load->model('model_spot');
		$spot_id = $this->input->post('SPOT_ID');
		
		$this->model_spot->delete_spot_by_id($spot_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>