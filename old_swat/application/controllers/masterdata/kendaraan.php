<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kendaraan extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);
	
		$this->load->model('model_kendaraan');
		$this->load->model('model_kategorikendaraan');
		$this->load->model('model_spot');
		$this->load->model('model_aplikasikendaraan');
		$this->load->model('model_kategorisumbersampah');
		$this->load->model('model_statuskendaraan');
		
		$data['all_aplikasikendaraan'] = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
		$data['all_kategorikendaraan'] = $this->model_kategorikendaraan->get_all_kategorikendaraan();
		$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
		$data['all_kode'] = $this->model_kategorisumbersampah->get_all_kategorisumbersampah();
		$data['all_statuskendaraan'] = $this->model_statuskendaraan->get_all_statuskendaraan();
		
		$this->template->set('title','Master Data Kendaraan | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kendaraan/index',$data);
	}
		
	public function getkendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		$this->load->model('model_kendaraan');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_kendaraan = $this->model_kendaraan->get_all_kendaraan();
		$result = $this->model_kendaraan->get_all_paging_sorting_kendaraan($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kendaraan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getkendaraanbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		$this->load->model('model_kendaraan');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$nopolKendaraan = $this->input->post('nopolKendaraan');
		$aplikasiKendaraan = $this->input->post('aplikasiKendaraan');
		$kategoriKendaraan = $this->input->post('kategoriKendaraan');
		$poolKendaraan = $this->input->post('poolKendaraan');
		$kodeKendaraan = $this->input->post('kodeKendaraan');
		$statusKendaraan = $this->input->post('statusKendaraan');
		
		$all_kendaraan = $this->model_kendaraan->get_all_kendaraan_by_filter($nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusKendaraan);
		$result = $this->model_kendaraan->get_all_paging_sorting_kendaraan_by_filter($nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusKendaraan,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kendaraan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getspot(){
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
	
	public function getstatuskendaraan(){
		$this->load->model('model_statuskendaraan');
		
		$all_statuskendaraan = $this->model_statuskendaraan->get_all_statuskendaraan();
		
		$rows = array();
		if($all_statuskendaraan->num_rows()>0){
			foreach($all_statuskendaraan->result_array() as $statuskendaraan){
				$dummy = array();
				$dummy["DisplayText"] = $statuskendaraan["STATUSKENDARAAN_NAMA"];
			    $dummy["Value"] = $statuskendaraan["STATUSKENDARAAN_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
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
	
	public function getkategorikendaraan(){
		$this->load->model('model_kategorikendaraan');
		$aplikasiKendaraanID = $this->input->get('aplikasiKendaraanID');
		if($aplikasiKendaraanID){
			$all_kategorikendaraan = $this->model_kategorikendaraan->get_kategorikendaraan_by_aplikasi_id($aplikasiKendaraanID);
		}
		else
			$all_kategorikendaraan = $this->model_kategorikendaraan->get_all_kategorikendaraan();
		
		$rows = array();
		if($all_kategorikendaraan->num_rows()>0){
			foreach($all_kategorikendaraan->result_array() as $kategorikendaraan){
				$dummy = array();
				$dummy["DisplayText"] = $kategorikendaraan["KATEGORIKENDARAAN_MERK"];
			    $dummy["Value"] = $kategorikendaraan["KATEGORIKENDARAAN_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
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
	
	public function createkendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);
		
		$this->load->model('model_kendaraan');
		
		$data_kendaraan = array(
			'SPOT_POOL_ID' => $this->input->post('SPOT_POOL_ID'),
			'STATUSKENDARAAN_ID' => $this->input->post('STATUSKENDARAAN_ID'),
			'KATEGORIKENDARAAN_ID' => $this->input->post('KATEGORIKENDARAAN_ID'),
			'KENDARAAN_NOMORPOLISI' => $this->input->post('KENDARAAN_NOMORPOLISI'),
			'KENDARAAN_NOMORRANGKA' => $this->input->post('KENDARAAN_NOMORRANGKA'),
			'KENDARAAN_NOMORMESIN' => $this->input->post('KENDARAAN_NOMORMESIN'),
			'KENDARAAN_TAHUNPEMBUATAN' => $this->input->post('KENDARAAN_TAHUNPEMBUATAN'),
			'KENDARAAN_RASIOBAHANBAKARTERKINI' => $this->input->post('KENDARAAN_RASIOBAHANBAKARTERKINI'),
			'KENDARAAN_BERATKOSONGTERKINI' => $this->input->post('KENDARAAN_BERATKOSONGTERKINI'),
			'KENDARAAN_KMTERKINI' => $this->input->post('KENDARAAN_KMTERKINI'),
			'KENDARAAN_MASABERLAKUSTNK' => $this->input->post('KENDARAAN_MASABERLAKUSTNK'),
			'KENDARAAN_MASABERLAKUPAJAKSTNK' => $this->input->post('KENDARAAN_MASABERLAKUPAJAKSTNK'),
			'KENDARAAN_KETERANGAN' => $this->input->post('KENDARAAN_KETERANGAN')
		);
		$this->model_kendaraan->insert_kendaraan($data_kendaraan);
	
		$lastInsertedKendaraan = $this->model_kendaraan->get_last_inserted_kendaraan();
		$rows = $lastInsertedKendaraan->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);
		
		$this->load->model('model_kendaraan');
		$kendaraan_id = $this->input->post('KENDARAAN_ID');
		
		$data_kendaraan = array(
			'SPOT_POOL_ID' => $this->input->post('SPOT_POOL_ID'),
			'STATUSKENDARAAN_ID' => $this->input->post('STATUSKENDARAAN_ID'),
			'KATEGORIKENDARAAN_ID' => $this->input->post('KATEGORIKENDARAAN_ID'),
			'KENDARAAN_NOMORPOLISI' => $this->input->post('KENDARAAN_NOMORPOLISI'),
			'KENDARAAN_NOMORRANGKA' => $this->input->post('KENDARAAN_NOMORRANGKA'),
			'KENDARAAN_NOMORMESIN' => $this->input->post('KENDARAAN_NOMORMESIN'),
			'KENDARAAN_TAHUNPEMBUATAN' => $this->input->post('KENDARAAN_TAHUNPEMBUATAN'),
			'KENDARAAN_RASIOBAHANBAKARTERKINI' => $this->input->post('KENDARAAN_RASIOBAHANBAKARTERKINI'),
			'KENDARAAN_BERATKOSONGTERKINI' => $this->input->post('KENDARAAN_BERATKOSONGTERKINI'),
			'KENDARAAN_KMTERKINI' => $this->input->post('KENDARAAN_KMTERKINI'),
			'KENDARAAN_MASABERLAKUSTNK' => $this->input->post('KENDARAAN_MASABERLAKUSTNK'),
			'KENDARAAN_MASABERLAKUPAJAKSTNK' => $this->input->post('KENDARAAN_MASABERLAKUPAJAKSTNK'),
			'KENDARAAN_KETERANGAN' => $this->input->post('KENDARAAN_KETERANGAN')
		);
		$this->model_kendaraan->update_kendaraan_by_id($kendaraan_id,$data_kendaraan);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekendaraan(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);
		
		$this->load->model('model_kendaraan');
		$this->load->model('model_kategorisumbersampahkendaraan');
		$kendaraan_id = $this->input->post('KENDARAAN_ID');
		
		$jTableResult = array();
		
		$all_kategorisumbersampahkendaraan = $this->model_kategorisumbersampahkendaraan->get_kategorisumbersampahkendaraan_by_kendaraan_id($kendaraan_id);
		if ($all_kategorisumbersampahkendaraan->num_rows() > 0){
			foreach($all_kategorisumbersampahkendaraan->result() as $row){
				$kategorisumbersampahkendaraan_id = $row->KATEGORISUMBERSAMPAHKENDARAAN_ID;
				$this->model_kategorisumbersampahkendaraan->delete_kategorisumbersampahkendaraan_by_id($kategorisumbersampahkendaraan_id);
			}
			$this->model_kendaraan->delete_kendaraan_by_id($kendaraan_id);
			$jTableResult['Result'] = "OK";
		}else{
			$this->model_kendaraan->delete_kendaraan_by_id($kendaraan_id);
			$jTableResult['Result'] = "OK";
		}
		
		
		print json_encode($jTableResult);
	}	
	
	public function getKategoriKendaraanByAplikasi(){
		$aplikasiKendaraanID = $this->input->post('aplikasiKendaraanID');
		$this->load->model('model_kategorikendaraan');
		
		$all_kategorikendaraan = $this->model_kategorikendaraan->get_kategorikendaraan_by_aplikasi_id($aplikasiKendaraanID);
		$data = "";
		if($all_kategorikendaraan->num_rows() > 0){
			$data .= "
						<option selected='selected' value='0'>All Kategori</option>
						";
			foreach($all_kategorikendaraan->result() as $kategorikendaraan){				
				$data .= "
							<option value='".$kategorikendaraan->KATEGORIKENDARAAN_MERK."'>".$kategorikendaraan->KATEGORIKENDARAAN_MERK."</option>
							";	
			}			
			
		}
		echo $data;
	}										
}

?>