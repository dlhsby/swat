<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kategorisumbersampah extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(76);
	
		$this->load->model('model_kategorisumbersampah');
		$data['all_kategorisumbersampah'] = $this->model_kategorisumbersampah->get_all_kategorisumbersampah();

		$this->template->set('title','Master Data Kategori Sumber Sampah| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kategorisumbersampah/index',$data);
	}
	
	public function getkategorisumbersampah(){
		$this->auth->restrict();
		$this->auth->cek_menu(76);

		$this->load->model('model_kategorisumbersampah');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_kategorisumbersampah = $this->model_kategorisumbersampah->get_all_kategorisumbersampah();
		$result = $this->model_kategorisumbersampah->get_all_paging_sorting_kategorisumbersampah($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kategorisumbersampah->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createkategorisumbersampah(){
		$this->auth->restrict();
		$this->auth->cek_menu(76);
		
		$this->load->model('model_kategorisumbersampah');
		
		$data_kategorisumbersampah = array(
			'KATEGORISUMBERSAMPAH_NAMA' => $this->input->post('KATEGORISUMBERSAMPAH_NAMA'),
			'KATEGORISUMBERSAMPAH_KODE' => $this->input->post('KATEGORISUMBERSAMPAH_KODE'),
			'KATEGORISUMBERSAMPAH_KETERANGAN' => $this->input->post('KATEGORISUMBERSAMPAH_KETERANGAN')
		);
		$this->model_kategorisumbersampah->insert_kategorisumbersampah($data_kategorisumbersampah);
	
		$lastInsertedKategorisumbersampah = $this->model_kategorisumbersampah->get_last_inserted_kategorisumbersampah();
		$rows = $lastInsertedKategorisumbersampah->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekategorisumbersampah(){
		$this->auth->restrict();
		$this->auth->cek_menu(76);
		
		$this->load->model('model_kategorisumbersampah');
		$kategorisumbersampah_id = $this->input->post('KATEGORISUMBERSAMPAH_ID');
		
		$data_kategorisumbersampah = array(
			'KATEGORISUMBERSAMPAH_NAMA' => $this->input->post('KATEGORISUMBERSAMPAH_NAMA'),
			'KATEGORISUMBERSAMPAH_KODE' => $this->input->post('KATEGORISUMBERSAMPAH_KODE'),
			'KATEGORISUMBERSAMPAH_KETERANGAN' => $this->input->post('KATEGORISUMBERSAMPAH_KETERANGAN')
		);
		$this->model_kategorisumbersampah->update_kategorisumbersampah_by_id($kategorisumbersampah_id,$data_kategorisumbersampah);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekategorisumbersampah(){
		$this->auth->restrict();
		$this->auth->cek_menu(76);
		
		$this->load->model('model_kategorisumbersampah');
		$kategorisumbersampah_id = $this->input->post('KATEGORISUMBERSAMPAH_ID');
		
		$this->model_kategorisumbersampah->delete_kategorisumbersampah_by_id($kategorisumbersampah_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
}	
?>