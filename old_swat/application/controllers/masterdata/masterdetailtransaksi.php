<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Masterdetailtransaksi extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(51);
		$this->load->model('model_spot');
		$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
		$this->template->set('title','Master Data Detail Transaksi | SWAT DKP');
		$this->template->load('template','masterdata/masterdetailtransaksi/index',$data);
	}
	
	public function getmasterdetailtransaksibyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(51);
		
		$this->load->model('model_masterdetailtransaksiangkutsampah');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$nopolKendaraan = $this->input->post('nopolKendaraan'); 
		$namaPengemudi = $this->input->post('namaPengemudi');
		$poolKendaraan = $this->input->post('poolKendaraan');
		
		$all_masterdetailtransaksi = $this->model_masterdetailtransaksiangkutsampah->get_all_masterdetailtransaksiangkutsampah_by_filter($nopolKendaraan,$namaPengemudi,$poolKendaraan);
		$result = $this->model_masterdetailtransaksiangkutsampah->get_all_paging_sorting_masterdetailtransaksiangkutsampah_by_filter($nopolKendaraan,$namaPengemudi,$poolKendaraan,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_masterdetailtransaksi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}	
															 
	public function createmasterdetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(51);
		$this->load->model('model_masterdetailtransaksiangkutsampah');
		
		$data_masterdetailtransaksiangkutsampah = array(
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'PENGEMUDI_ID' => $this->input->post('PENGEMUDI_ID'),
			'MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG' => $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG'),
			'MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG' => $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG')	
		);
		$this->model_masterdetailtransaksiangkutsampah->insert_masterdetailtransaksiangkutsampah($data_masterdetailtransaksiangkutsampah);
	
		$lastInsertedMasterDetailTransaksi = $this->model_masterdetailtransaksiangkutsampah->get_last_inserted_masterdetailtransaksiangkutsampah();
		$rows = $lastInsertedMasterDetailTransaksi->row();
		$masterDetailTransaksiInsertedID = $rows->MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID;
		
		$masterDetailTransaksiInsertedCompleteInfo = $this->model_masterdetailtransaksiangkutsampah->get_masterdetailtransaksiangkutsampah_by_id_with_kendaraan_and_with_pengemudi($masterDetailTransaksiInsertedID);
		
		$resultAdded = $masterDetailTransaksiInsertedCompleteInfo->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $resultAdded;
		print json_encode($jTableResult);	
	}
	
	public function updatemasterdetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(51);
		$this->load->model('model_masterdetailtransaksiangkutsampah');
		$masterdetailtransaksiangkutsampah_id = $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID');
		$data_masterdetailtransaksiangkutsampah = array(
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'PENGEMUDI_ID' => $this->input->post('PENGEMUDI_ID'),
			'MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG' => $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG'),
			'MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG' => $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG')	
		);
		$this->model_masterdetailtransaksiangkutsampah->update_masterdetailtransaksiangkutsampah_by_id($masterdetailtransaksiangkutsampah_id,$data_masterdetailtransaksiangkutsampah);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletemasterdetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(51);
		
		$this->load->model('model_masterdetailtransaksiangkutsampah');
		$masterdetailtransaksiangkutsampah_id = $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID');
		
		$this->model_masterdetailtransaksiangkutsampah->delete_masterdetailtransaksiangkutsampah_by_id($masterdetailtransaksiangkutsampah_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function getmastertrayekbymasterdetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(99);
		
		$this->load->model('model_mastertrayek');
		
		$masterTrayekID =  $this->input->get('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID');
		
		$all_masterTrayek = $this->model_mastertrayek->get_mastertrayek_by_masterdetailtransaksiangkutsampah_id_with_masterdetailtransaksiangkutsampah_and_rute($masterTrayekID);
		$result = $this->model_mastertrayek->get_mastertrayek_by_masterdetailtransaksiangkutsampah_id_with_masterdetailtransaksiangkutsampah_and_rute($masterTrayekID);
		
		$rows = $result->result_array();
		$recordCount = $all_masterTrayek->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createmastertrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(99);
		$this->load->model('model_mastertrayek');
		$this->load->model('model_rute');
		
		$spotAsalID = $this->input->post('SPOT_ASAL_ID');
		$spotTujuanID = $this->input->post('SPOT_TUJUAN_ID');
		$rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($spotAsalID,$spotTujuanID);
		$ruteID = 1;
		if ($rute->num_rows() > 0){
			$ruteRow = $rute->row();
			$ruteID = $ruteRow->RUTE_ID;
		}
		
		$data_mastertrayek = array(
			'MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID'),
			'RUTE_ID' => $ruteID,
			'MASTERTRAYEK_WAKTUTARGET' => $this->input->post('MASTERTRAYEK_WAKTUTARGET'),
			'MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN' => $this->input->post('MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN')
		);
		$this->model_mastertrayek->insert_mastertrayek($data_mastertrayek);
	
		$lastInsertedMasterTrayek = $this->model_mastertrayek->get_last_inserted_mastertrayek();
		$rows = $lastInsertedMasterTrayek->row();
		$masterTrayekInsertedID = $rows->MASTERTRAYEK_ID;
		
		$masterTrayekInsertedCompleteInfo = $this->model_mastertrayek->get_mastertrayek_by_mastertrayek_id_with_masterdetailtransaksiangkutsampah_and_rute($masterTrayekInsertedID);
		
		$resultAdded = $masterTrayekInsertedCompleteInfo->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $resultAdded;
		print json_encode($jTableResult);	
	}
	
	public function updatemastertrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(99);
		$this->load->model('model_mastertrayek');
		$this->load->model('model_rute');
		
		$spotAsalID = $this->input->post('SPOT_ASAL_ID');
		$spotTujuanID = $this->input->post('SPOT_TUJUAN_ID');
		$rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($spotAsalID,$spotTujuanID);
		$ruteID = 1;
		if ($rute->num_rows() > 0){
			$ruteRow = $rute->row();
			$ruteID = $ruteRow->RUTE_ID;
		}
		
		$masterTrayek_id = $this->input->post('MASTERTRAYEK_ID');
		$data_mastertrayek = array(
			'MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID'),
			'RUTE_ID' => $ruteID,
			'MASTERTRAYEK_WAKTUTARGET' => $this->input->post('MASTERTRAYEK_WAKTUTARGET'),
			'MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN' => $this->input->post('MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN')
		);
		$this->model_mastertrayek->update_mastertrayek_by_id($masterTrayek_id,$data_mastertrayek);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletemastertrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(99);
		
		$this->load->model('model_mastertrayek');
		$masterTrayek_id = $this->input->post('MASTERTRAYEK_ID');
		
		$this->model_mastertrayek->delete_mastertrayek_by_id($masterTrayek_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
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
	
	public function getspotbykategorispot(){
		$this->load->model('model_spot');
		
		$kategoriSpotID = $this->input->get('kategoriSpotID');
		
		if($kategoriSpotID)
			$all_spot = $this->model_spot->get_spot_by_kategorispot($kategoriSpotID);
		else
			$all_spot = $this->model_spot->get_all_spot(); 
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
	
	public function getpengemudi(){
		$this->load->model('model_pengemudi');
		
		$poolID = $this->input->get('poolID');
		
		if($poolID){
			$all_pengemudi = $this->model_pengemudi->get_pengemudi_by_pool($poolID);
		}
		else
			$all_pengemudi = $this->model_pengemudi->get_all_pengemudi(); 
		
		$rows = array();
		if($all_pengemudi->num_rows()>0){
			foreach($all_pengemudi->result_array() as $pengemudi){
				$dummy = array();
				$dummy["DisplayText"] = $pengemudi["PENGEMUDI_NAMA"];
			    $dummy["Value"] = $pengemudi["PENGEMUDI_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
}