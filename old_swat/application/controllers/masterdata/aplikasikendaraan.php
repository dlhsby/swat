<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Aplikasikendaraan extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(65);
	
		$this->load->model('model_aplikasikendaraan');
		$data['all_aplikasikendaraan'] = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();

		$this->template->set('title','Master Data Aplikasi Kendaraan| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/aplikasikendaraan/index',$data);
	}
	
	public function getaplikasikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(65);

		$this->load->model('model_aplikasikendaraan');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_aplikasikendaraan = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
		$result = $this->model_aplikasikendaraan->get_all_paging_sorting_aplikasikendaraan($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_aplikasikendaraan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getaplikasikendaraanbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(65);

		$this->load->model('model_aplikasikendaraan');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$namaAplikasi =  $this->input->post('namaAplikasi');
		
		$all_aplikasikendaraan = $this->model_aplikasikendaraan->get_all_aplikasikendaraan_by_filter($namaAplikasi);
		$result = $this->model_aplikasikendaraan->get_all_paging_sorting_aplikasikendaraan_by_filter($namaAplikasi,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_aplikasikendaraan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createaplikasikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(65);
		
		$this->load->model('model_aplikasikendaraan');
		
		$data_aplikasikendaraan = array(
			'APLIKASIKENDARAAN_NAMA' => $this->input->post('APLIKASIKENDARAAN_NAMA')
		);
		$this->model_aplikasikendaraan->insert_aplikasikendaraan($data_aplikasikendaraan);
	
		$lastInsertedAplikasikendaraan = $this->model_aplikasikendaraan->get_last_inserted_aplikasikendaraan();
		$rows = $lastInsertedAplikasikendaraan->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updateaplikasikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(65);
		
		$this->load->model('model_aplikasikendaraan');
		$aplikasikendaraan_id = $this->input->post('APLIKASIKENDARAAN_ID');
		
		$data_aplikasikendaraan = array(
			'APLIKASIKENDARAAN_NAMA' => $this->input->post('APLIKASIKENDARAAN_NAMA')
		);
		$this->model_aplikasikendaraan->update_aplikasikendaraan_by_id($aplikasikendaraan_id,$data_aplikasikendaraan);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deleteaplikasikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(65);
		
		$this->load->model('model_aplikasikendaraan');
		$aplikasikendaraan_id = $this->input->post('APLIKASIKENDARAAN_ID');
		
		$this->model_aplikasikendaraan->delete_aplikasikendaraan_by_id($aplikasikendaraan_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>