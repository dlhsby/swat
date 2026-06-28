<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kategorisumbersampahkendaraan extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(93);
	
		$this->load->model('model_kategorisumbersampah');
		$this->load->model('model_spot');
		$data['all_kode'] = $this->model_kategorisumbersampah->get_all_kategorisumbersampah();
		$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);

		$this->template->set('title','Master Data Kategori Sumber Sampah Kendaraan| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kategorisumbersampahkendaraan/index',$data);
	}	
	
	public function getkategorisumbersampahkendaraan_by_filter(){
		$this->auth->restrict();
		$this->auth->cek_menu(93);

		$this->load->model('model_kategorisumbersampahkendaraan');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$nopolKendaraan = $this->input->post('nopolKendaraan');
		$poolKendaraan = $this->input->post('poolKendaraan');
		$kodeKendaraan = $this->input->post('kodeKendaraan');
		
		$all_kategorisumbersampahkendaraan = $this->model_kategorisumbersampahkendaraan->get_all_kategorisumbersampahkendaraan_by_filter($nopolKendaraan,$poolKendaraan,$kodeKendaraan);
		$result = $this->model_kategorisumbersampahkendaraan->get_all_paging_sorting_kategorisumbersampahkendaraan_by_filter($nopolKendaraan,$poolKendaraan,$kodeKendaraan,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kategorisumbersampahkendaraan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createkategorisumbersampahkendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(93);
		
		$this->load->model('model_kategorisumbersampahkendaraan');
		
		$data_kategorisumbersampahkendaraan = array(
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'KATEGORISUMBERSAMPAH_ID' => $this->input->post('KATEGORISUMBERSAMPAH_ID')
		);
		$this->model_kategorisumbersampahkendaraan->insert_kategorisumbersampahkendaraan($data_kategorisumbersampahkendaraan);
	
		$lastInsertedKategorisumbersampahkendaraan = $this->model_kategorisumbersampahkendaraan->get_last_inserted_kategorisumbersampahkendaraan();
		$rows = $lastInsertedKategorisumbersampahkendaraan->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekategorisumbersampahkendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(93);
		
		$this->load->model('model_kategorisumbersampahkendaraan');
		$kategorisumbersampahkendaraan_id = $this->input->post('KATEGORISUMBERSAMPAHKENDARAAN_ID');
		
		$data_kategorisumbersampahkendaraan = array(			
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'KATEGORISUMBERSAMPAH_ID' => $this->input->post('KATEGORISUMBERSAMPAH_ID')
		);
		$this->model_kategorisumbersampahkendaraan->update_kategorisumbersampahkendaraan_by_id($kategorisumbersampahkendaraan_id,$data_kategorisumbersampahkendaraan);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekategorisumbersampahkendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(93);
		
		$this->load->model('model_kategorisumbersampahkendaraan');
		$kategorisumbersampahkendaraan_id = $this->input->post('KATEGORISUMBERSAMPAHKENDARAAN_ID');
		
		$this->model_kategorisumbersampahkendaraan->delete_kategorisumbersampahkendaraan_by_id($kategorisumbersampahkendaraan_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}

	public function getkategorisumbersampah(){
		$this->load->model('model_kategorisumbersampah');
		
		$all_kategorisumbersampah = $this->model_kategorisumbersampah->get_all_kategorisumbersampah();
		
		$rows = array();
		if($all_kategorisumbersampah->num_rows()>0){
			foreach($all_kategorisumbersampah->result_array() as $kategorisumbersampah){
				$dummy = array();
				$dummy["DisplayText"] = $kategorisumbersampah["KATEGORISUMBERSAMPAH_NAMA"];
			    $dummy["Value"] = $kategorisumbersampah["KATEGORISUMBERSAMPAH_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getkendaraan(){
		$this->load->model('model_kendaraan');
		
		$poolID = $this->input->get('poolID');
		if($poolID){
			$all_kendaraan = $this->model_kendaraan->get_kendaraan_by_pool_id($poolID);
		}
		else
			$all_kendaraan = $this->model_kendaraan->get_all_kendaraan(); 
		
		$rows = array();
		if($all_kendaraan->num_rows()>0){
			foreach($all_kendaraan->result_array() as $kendaraan){
				$dummy = array();
				$dummy["DisplayText"] = $kendaraan["KENDARAAN_NOMORPOLISI"];
			    $dummy["Value"] = $kendaraan["KENDARAAN_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}

	public function getpool(){
		$this->load->model('model_spot');
		
		$all_spot = $this->model_spot->get_spot_by_kategorispot(1);
		
		$rows = array();
		if($all_spot->num_rows()>0){
			foreach($all_spot->result_array() as $spot){
				$dummy = array();
				$dummy["DisplayText"] = $spot["SPOT_NAMA"];
			    $dummy["Value"] = $spot["SPOT_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
}	
?>