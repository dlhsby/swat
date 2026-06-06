<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kategorikendaraan extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(66);
	
		$this->load->model('model_kategorikendaraan');
		$data['all_kategorikendaraan'] = $this->model_kategorikendaraan->get_all_kategorikendaraan();

		$this->template->set('title','Master Data Kategori Kendaraan| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kategorikendaraan/index',$data);
	}
	
	public function getkategorikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(66);

		$this->load->model('model_kategorikendaraan');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_kategorikendaraan = $this->model_kategorikendaraan->get_all_kategorikendaraan();
		$result = $this->model_kategorikendaraan->get_all_paging_sorting_kategorikendaraan($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kategorikendaraan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getaplikasikendaraan(){
		$this->load->model('model_aplikasikendaraan');
		
		$all_aplikasikendaraan = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
		
		$rows = array();
		if($all_aplikasikendaraan->num_rows()>0){
			foreach($all_aplikasikendaraan->result_array() as $aplikasikendaraan){
				$dummy = array();
				$dummy["DisplayText"] = $aplikasikendaraan["APLIKASIKENDARAAN_NAMA"];
			    $dummy["Value"] = $aplikasikendaraan["APLIKASIKENDARAAN_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getbahanbakar(){
		$this->load->model('model_bahanbakar');
		
		$all_bahanbakar = $this->model_bahanbakar->get_all_bahanbakar();
		
		$rows = array();
		if($all_bahanbakar->num_rows()>0){
			foreach($all_bahanbakar->result_array() as $bahanbakar){
				$dummy = array();
				$dummy["DisplayText"] = $bahanbakar["BAHANBAKAR_NAMA"];
			    $dummy["Value"] = $bahanbakar["BAHANBAKAR_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createkategorikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(66);
		
		$this->load->model('model_kategorikendaraan');
		
		$data_kategorikendaraan = array(
			'APLIKASIKENDARAAN_ID' => $this->input->post('APLIKASIKENDARAAN_ID'),
			'KATEGORIKENDARAAN_MERK' => $this->input->post('KATEGORIKENDARAAN_MERK'),
			'BAHANBAKAR_ID' => $this->input->post('BAHANBAKAR_ID'),
			'KATEGORIKENDARAAN_KAPASITASBAHANBAKAR' => $this->input->post('KATEGORIKENDARAAN_KAPASITASBAHANBAKAR'),
			'KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL' => $this->input->post('KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL'),
			'KATEGORIKENDARAAN_BERATKOSONGNORMAL' => $this->input->post('KATEGORIKENDARAAN_BERATKOSONGNORMAL'),
			'KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM' => $this->input->post('KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM'),
			'KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM' => $this->input->post('KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM'),
			'KATEGORIKENDARAAN_JUMLAHRODA' => $this->input->post('KATEGORIKENDARAAN_JUMLAHRODA')
		);
		$this->model_kategorikendaraan->insert_kategorikendaraan($data_kategorikendaraan);
	
		$lastInsertedKategorikendaraan = $this->model_kategorikendaraan->get_last_inserted_kategorikendaraan();
		$rows = $lastInsertedKategorikendaraan->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekategorikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(66);
		
		$this->load->model('model_kategorikendaraan');
		$kategorikendaraan_id = $this->input->post('KATEGORIKENDARAAN_ID');
		
		$data_kategorikendaraan = array(
			'APLIKASIKENDARAAN_ID' => $this->input->post('APLIKASIKENDARAAN_ID'),
			'KATEGORIKENDARAAN_MERK' => $this->input->post('KATEGORIKENDARAAN_MERK'),
			'BAHANBAKAR_ID' => $this->input->post('BAHANBAKAR_ID'),
			'KATEGORIKENDARAAN_KAPASITASBAHANBAKAR' => $this->input->post('KATEGORIKENDARAAN_KAPASITASBAHANBAKAR'),
			'KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL' => $this->input->post('KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL'),
			'KATEGORIKENDARAAN_BERATKOSONGNORMAL' => $this->input->post('KATEGORIKENDARAAN_BERATKOSONGNORMAL'),
			'KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM' => $this->input->post('KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM'),
			'KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM' => $this->input->post('KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM'),
			'KATEGORIKENDARAAN_JUMLAHRODA' => $this->input->post('KATEGORIKENDARAAN_JUMLAHRODA')
		);
		$this->model_kategorikendaraan->update_kategorikendaraan_by_id($kategorikendaraan_id,$data_kategorikendaraan);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekategorikendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(66);
		
		$this->load->model('model_kategorikendaraan');
		$kategorikendaraan_id = $this->input->post('KATEGORIKENDARAAN_ID');
		
		$this->model_kategorikendaraan->delete_kategorikendaraan_by_id($kategorikendaraan_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>