<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Penjadwalan extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(79);
		
		$this->load->model('model_haritransaksi');
		$this->load->model('model_statusharitransaksi');
		
		$hariTransaksiTanggal = $this->uri->segment(4);
		
		$data['all_statusharitransaksi'] = $this->model_statusharitransaksi->get_all_statusharitransaksi();
		
		$this->template->set('title','Penjadwalan Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/penjadwalan/index',$data);
	}
	
	public function hari(){
		$this->auth->restrict();
		$this->auth->cek_menu(81);
		
		$this->load->model('model_haritransaksi');
		$this->load->model('model_statusharitransaksi');
		
		$hariTransaksiTanggal = $this->uri->segment(4);
		
		$data['all_statusharitransaksi'] = $this->model_statusharitransaksi->get_all_statusharitransaksi();
		
		$this->template->set('title','Penjadwalan Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/penjadwalan/hari/index',$data);
	}
	
	public function getpenjadwalanhari(){
		$this->auth->restrict();
		$this->auth->cek_menu(81);
		
		$this->load->model('model_haritransaksi');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_penjadwalan = $this->model_haritransaksi->get_all_haritransaksi();
		$result = $this->model_haritransaksi->get_all_paging_sorting_haritransaksi($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getpenjadwalanharibyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(81);
		
		$this->load->model('model_haritransaksi');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$tanggalHariTransaksi = $this->input->post('tanggalHariTransaksi');
		$statusHariTransaksi = $this->input->post('statusHariTransaksi');
		
		$all_penjadwalan = $this->model_haritransaksi->get_all_haritransaksi_by_filter($tanggalHariTransaksi,$statusHariTransaksi);
		$result = $this->model_haritransaksi->get_all_paging_sorting_haritransaksi_by_filter($tanggalHariTransaksi,$statusHariTransaksi,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalan->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getstatusharitransaksi(){
		$this->load->model('model_statusharitransaksi');
		
		$all_statusharitransaksi = $this->model_statusharitransaksi->get_all_statusharitransaksi();
		
		$rows = array();
		if($all_statusharitransaksi->num_rows()>0){
			foreach($all_statusharitransaksi->result_array() as $statusharitransaksi){
				$dummy = array();
				$dummy["DisplayText"] = $statusharitransaksi["STATUSHARITRANSAKSI_NAMA"];
			    $dummy["Value"] = $statusharitransaksi["STATUSHARITRANSAKSI_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function transaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_haritransaksi');
		$this->load->model('model_statustransaksiangkutsampah');
		$this->load->model('model_spot');
		$this->load->model('model_kategorisumbersampah');
		$this->load->model('model_aplikasikendaraan');
		$this->load->model('model_kategorikendaraan');
		
		$hariTransaksiTanggal = $this->uri->segment(4);
		$hariTransaksi = $this->model_haritransaksi->get_haritransaksi_by_tanggal($hariTransaksiTanggal);
		$hariTransaksiID = NULL;
		if($hariTransaksi->num_rows>0){
			$row = $hariTransaksi->row();
			$hariTransaksiID = $row->HARITRANSAKSI_ID;
		}
		$data['all_statustransaksiangkutsampah'] = $this->model_statustransaksiangkutsampah->get_all_statustransaksiangkutsampah();
		$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
		$data['all_kode'] = $this->model_kategorisumbersampah->get_all_kategorisumbersampah();
		$data['all_aplikasikendaraan'] = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
		$data['all_kategorikendaraan'] = $this->model_kategorikendaraan->get_all_kategorikendaraan();
		$data['hariTransaksiTanggal'] = $hariTransaksiTanggal;
		$data['hariTransaksiID'] = $hariTransaksiID;
		
		$this->template->set('title','Penjadwalan Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/penjadwalan/transaksi/index',$data);
	}
	
	public function getpenjadwalantransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_transaksiangkutsampah');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_penjadwalanTransaksi = $this->model_transaksiangkutsampah->get_all_transaksiangkutsampah();
		$result = $this->model_transaksiangkutsampah->get_all_paging_sorting_transaksi($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanTransaksi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getpenjadwalantransaksibyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_transaksiangkutsampah');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$tanggalHariTransaksi = $this->input->post('tanggalHariTransaksi');
		$nomorPolisiKendaraan = $this->input->post('nomorPolisiKendaraan');
		$aplikasiKendaraan = $this->input->post('aplikasiKendaraan');
		$kategoriKendaraan = $this->input->post('kategoriKendaraan');
		$poolKendaraan = $this->input->post('poolKendaraan');
		$kodeKendaraan = $this->input->post('kodeKendaraan');
		$statusTransaksi = $this->input->post('statusTransaksi');
		
		
		$all_penjadwalanTransaksi = $this->model_transaksiangkutsampah->get_all_transaksiangkutsampah_by_filter($tanggalHariTransaksi,$nomorPolisiKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusTransaksi);
		$result = $this->model_transaksiangkutsampah->get_all_paging_sorting_transaksiangkutsampah_by_filter($tanggalHariTransaksi,$nomorPolisiKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$poolKendaraan,$kodeKendaraan,$statusTransaksi,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanTransaksi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}

	public function createpenjadwalantransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		$this->load->model('model_transaksiangkutsampah');
		
		$data_transaksiangkutsampah = array(
			'HARITRANSAKSI_ID' => $this->input->post('HARITRANSAKSI_ID'),
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'STATUSTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('STATUSTRANSAKSIANGKUTSAMPAH_ID'),
			'TRANSAKSIANGKUTSAMPAH_KETERANGAN' => $this->input->post('TRANSAKSIANGKUTSAMPAH_KETERANGAN')
		);
		$this->model_transaksiangkutsampah->insert_transaksiangkutsampah($data_transaksiangkutsampah);
	
		$lastInsertedTransaksi = $this->model_transaksiangkutsampah->get_last_inserted_transaksiangkutsampah();
		$rows = $lastInsertedTransaksi->row();
		$transaksiInsertedID = $rows->TRANSAKSIANGKUTSAMPAH_ID;
		
		$transaksiInsertedCompleteInfo = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_transaksi_id_with_haritransaksi_kendaraan_statustransaksi($transaksiInsertedID);
		
		$resultAdded = $transaksiInsertedCompleteInfo->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $resultAdded;
		print json_encode($jTableResult);	
	}

	public function updatepenjadwalantransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		$this->load->model('model_transaksiangkutsampah');
		$transaksiangkutsampah_id = $this->input->post('TRANSAKSIANGKUTSAMPAH_ID');
		$data_transaksiangkutsampah = array(
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'STATUSTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('STATUSTRANSAKSIANGKUTSAMPAH_ID'),
			'TRANSAKSIANGKUTSAMPAH_KETERANGAN' => $this->input->post('TRANSAKSIANGKUTSAMPAH_KETERANGAN')
		);
		$this->model_transaksiangkutsampah->update_transaksiangkutsampah_by_id($transaksiangkutsampah_id,$data_transaksiangkutsampah);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}

	public function deletepenjadwalantransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_transaksiangkutsampah');
		$transaksiangkutsampah_id = $this->input->post('TRANSAKSIANGKUTSAMPAH_ID');
		
		$this->model_transaksiangkutsampah->delete_transaksiangkutsampah_by_id($transaksiangkutsampah_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function detailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(82);
		
		$this->load->model('model_statusdetailtransaksiangkutsampah');
		$this->load->model('model_transaksiangkutsampah');
		$this->load->model('model_haritransaksi');
		
		$transaksiID = $this->uri->segment(4);
		
		$hariTransaksiID = NULL;
		$hariTransaksiTanggal = NULL;
		
		$transaksi = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_id($transaksiID);
		if($transaksi->num_rows > 0){
			$row1 = $transaksi->row();
			$hariTransaksiID = $row1->HARITRANSAKSI_ID;
			$hariTransaksi = $this->model_haritransaksi->get_haritransaksi_by_id($hariTransaksiID);
			if($hariTransaksi->num_rows() > 0){
				$row2 = $hariTransaksi->row();
				$hariTransaksiTanggal = $row2->HARITRANSAKSI_TANGGAL;
			}
		}
		
		
		$data['all_statusdetailtransaksiangkutsampah'] = $this->model_statusdetailtransaksiangkutsampah->get_all_statusdetailtransaksiangkutsampah();
		$data['transaksiID'] = $transaksiID;
		$data['hariTransaksiID'] = $hariTransaksiID;
		$data['hariTransaksiTanggal'] = $hariTransaksiTanggal;
		
		$this->template->set('title','Penjadwalan Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/penjadwalan/detailtransaksi/index',$data);
	}

	public function getpenjadwalandetailtransaksibyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(82);
		
		$this->load->model('model_detailtransaksiangkutsampah');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$transaksiID = $this->input->post('transaksiID');
		$statusDetailTransaksi = $this->input->post('statusDetailTransaksi');
		
		
		$all_penjadwalanDetailTransaksi = $this->model_detailtransaksiangkutsampah->get_all_detailtransaksiangkutsampah_with_pengemudi_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah_by_filter($transaksiID,$statusDetailTransaksi);
		$result = $this->model_detailtransaksiangkutsampah->get_all_paging_sorting_detailtransaksiangkutsampah_with_pengemudi_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah_by_filter($transaksiID,$statusDetailTransaksi,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanDetailTransaksi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createpenjadwalandetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(82);
		$this->load->model('model_detailtransaksiangkutsampah');
		
		$data_detailtransaksiangkutsampah = array(
			'TRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('TRANSAKSIANGKUTSAMPAH_ID'),
			'PENGEMUDI_ID' => $this->input->post('PENGEMUDI_ID'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG'),
			'STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID'),
			'DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN')
		);
		$this->model_detailtransaksiangkutsampah->insert_detailtransaksiangkutsampah($data_detailtransaksiangkutsampah);
	
		$lastInsertedDetailTransaksi = $this->model_detailtransaksiangkutsampah->get_last_inserted_detailtransaksiangkutsampah();
		$rows = $lastInsertedDetailTransaksi->row();
		$detailTransaksiInsertedID = $rows->DETAILTRANSAKSIANGKUTSAMPAH_ID;
		
		$detailTransaksiInsertedCompleteInfo = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_detailtransaksiangkutsampah_id_with_pengemudi_and_masterdetailtransaksiangkutsampah_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah($detailTransaksiInsertedID);
		
		$resultAdded = $detailTransaksiInsertedCompleteInfo->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $resultAdded;
		print json_encode($jTableResult);	
	}

	public function updatepenjadwalandetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(82);
		$this->load->model('model_detailtransaksiangkutsampah');
		$detailtransaksiangkutsampah_id = $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_ID');
		$data_detailtransaksiangkutsampah = array(
			'PENGEMUDI_ID' => $this->input->post('PENGEMUDI_ID'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG'),
			'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG'),
			'STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID'),
			'DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN')
		);
		$this->model_detailtransaksiangkutsampah->update_detailtransaksiangkutsampah_by_id($detailtransaksiangkutsampah_id,$data_detailtransaksiangkutsampah);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}

	public function deletepenjadwalandetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(82);
		
		$this->load->model('model_detailtransaksiangkutsampah');
		$detailtransaksiangkutsampah_id = $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_ID');
		
		$this->model_detailtransaksiangkutsampah->delete_detailtransaksiangkutsampah_by_id($detailtransaksiangkutsampah_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function trayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(83);
		
		$this->load->model('model_statustrayek');
		$this->load->model('model_detailtransaksiangkutsampah');
		$this->load->model('model_transaksiangkutsampah');
		$this->load->model('model_haritransaksi');
		$detailTransaksiID = $this->uri->segment(4);
		
		$data['all_statustrayek'] = $this->model_statustrayek->get_all_statustrayek();
		$data['detailTransaksiID'] = $detailTransaksiID;
		$detailTransaksi = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_id($detailTransaksiID);
		$transaksiID = NULL;
		$hariTransaksiID = NULL;
		$hariTransaksiTanggal = NULL;
		if($detailTransaksi->num_rows() > 0){
			$row1 = $detailTransaksi->row();
			$transaksiID = $row1->TRANSAKSIANGKUTSAMPAH_ID;
			$transaksi = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_id($transaksiID);
			if($transaksi->num_rows > 0){
				$row2 = $transaksi->row();
				$hariTransaksiID = $row2->HARITRANSAKSI_ID;
				$hariTransaksi = $this->model_haritransaksi->get_haritransaksi_by_id($hariTransaksiID);
				if($hariTransaksi->num_rows() > 0){
					$row3 = $hariTransaksi->row();
					$hariTransaksiTanggal = $row3->HARITRANSAKSI_TANGGAL;
				}
			}
		}
		$data['hariTransaksiID'] = $hariTransaksiID;
		$data['hariTransaksiTanggal'] = $hariTransaksiTanggal;
		$data['transaksiID'] = $transaksiID;
		
		$this->template->set('title','Penjadwalan Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/penjadwalan/trayek/index',$data);
	}
	
	public function getpenjadwalantrayekbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(83);
		
		$this->load->model('model_trayek');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$detailTransaksiID = $this->input->post('detailTransaksiID');
		$statusTrayek = $this->input->post('statusTrayek');
		
		
		$all_penjadwalanTrayek = $this->model_trayek->get_all_trayek_with_detailtransaksiangkutsampah_and_rute_and_statustrayek_by_filter($detailTransaksiID,$statusTrayek);
		$result = $this->model_trayek->get_all_paging_sorting_trayek_with_detailtransaksiangkutsampah_and_rute_and_statustrayek_by_filter($detailTransaksiID,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanTrayek->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createpenjadwalantrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(83);
		$this->load->model('model_trayek');
		$this->load->model('model_rute');
		
		$spotAsalID = $this->input->post('SPOT_ASAL_ID');
		$spotTujuanID = $this->input->post('SPOT_TUJUAN_ID');
		$rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($spotAsalID,$spotTujuanID);
		$ruteID = 1;
		$kategoriRuteNama = "";
		$spotAsalNama = "";
		$spotTujuanNama = "";
		if ($rute->num_rows() > 0){
			$ruteRow = $rute->row();
			$ruteID = $ruteRow->RUTE_ID;
			$kategoriRuteNama = $ruteRow->KATEGORIRUTE_NAMA;
			$spotAsalNama = $ruteRow->RUTE_ASAL_NAMA;
			$spotTujuanNama = $ruteRow->RUTE_TUJUAN_NAMA;
		}
		
		date_default_timezone_set('Asia/Jakarta');
		$waktuSekarangHariIni = (new \DateTime())->format('Y-m-d H:i:s');
		
		$data_trayek = array(
			'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('DETAILTRANSAKSIANGKUTSAMPAH_ID'),
			'TRAYEK_NAMA' => $kategoriRuteNama." di ".$spotTujuanNama,
			'RUTE_ID' => $ruteID,
			'TRAYEK_KMTARGET' => $this->input->post('TRAYEK_KMTARGET'),
			'TRAYEK_WAKTUTARGET' => $this->input->post('TRAYEK_WAKTUTARGET'),
			'TRAYEK_JUMLAHISIBBMDIAJUKAN' => $this->input->post('TRAYEK_JUMLAHISIBBMDIAJUKAN'),
			'TRAYEK_WAKTUREALISASI' => $this->input->post('TRAYEK_WAKTUREALISASI'),
			'TRAYEK_BERATKOTORTIMBANGAN' => $this->input->post('TRAYEK_BERATKOTORTIMBANGAN'),
			'TRAYEK_BERATKOSONGKENDARAAN' => $this->input->post('TRAYEK_BERATKOSONGKENDARAAN'),
			'TRAYEK_BERATBERSIHSAMPAH' => $this->input->post('TRAYEK_BERATBERSIHSAMPAH'),
			'STATUSTRAYEK_ID' => $this->input->post('STATUSTRAYEK_ID'),
			'TRAYEK_KETERANGAN' => $this->input->post('TRAYEK_KETERANGAN'),
			'TRAYEK_WAKTUENTRIPENJADWALAN' => $waktuSekarangHariIni,
		);
		$this->model_trayek->insert_trayek($data_trayek);
	
		$lastInsertedTrayek = $this->model_trayek->get_last_inserted_trayek();
		$rows = $lastInsertedTrayek->row();
		$trayekInsertedID = $rows->TRAYEK_ID;
		
		$trayekInsertedCompleteInfo = $this->model_trayek->get_trayek_by_trayek_id_with_detailtransaksiangkutsampah_and_rute_and_statustrayek($trayekInsertedID);
		
		$resultAdded = $trayekInsertedCompleteInfo->row();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $resultAdded;
		print json_encode($jTableResult);	
	}
	
	public function updatepenjadwalantrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(83);
		$this->load->model('model_trayek');
		$this->load->model('model_rute');
		
		$spotAsalID = $this->input->post('SPOT_ASAL_ID');
		$spotTujuanID = $this->input->post('SPOT_TUJUAN_ID');
		$rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($spotAsalID,$spotTujuanID);
		$ruteID = 1;
		$kategoriRuteNama = "";
		$spotAsalNama = "";
		$spotTujuanNama = "";
		if ($rute->num_rows() > 0){
			$ruteRow = $rute->row();
			$ruteID = $ruteRow->RUTE_ID;
			$kategoriRuteNama = $ruteRow->KATEGORIRUTE_NAMA;
			$spotAsalNama = $ruteRow->RUTE_ASAL_NAMA;
			$spotTujuanNama = $ruteRow->RUTE_TUJUAN_NAMA;
		}
		
		$trayek_id = $this->input->post('TRAYEK_ID');
		$data_trayek = array(
			'TRAYEK_NAMA' => $kategoriRuteNama." di ".$spotTujuanNama,
			'RUTE_ID' => $ruteID,
			'TRAYEK_KMTARGET' => $this->input->post('TRAYEK_KMTARGET'),
			'TRAYEK_WAKTUTARGET' => $this->input->post('TRAYEK_WAKTUTARGET'),
			'TRAYEK_WAKTUREALISASI' => $this->input->post('TRAYEK_WAKTUREALISASI'),
			'TRAYEK_BERATKOTORTIMBANGAN' => $this->input->post('TRAYEK_BERATKOTORTIMBANGAN'),
			'TRAYEK_BERATKOSONGKENDARAAN' => $this->input->post('TRAYEK_BERATKOSONGKENDARAAN'),
			'TRAYEK_BERATBERSIHSAMPAH' => $this->input->post('TRAYEK_BERATBERSIHSAMPAH'),
			'TRAYEK_JUMLAHISIBBMDIAJUKAN' => $this->input->post('TRAYEK_JUMLAHISIBBMDIAJUKAN'),
			'STATUSTRAYEK_ID' => $this->input->post('STATUSTRAYEK_ID'),
			'TRAYEK_KETERANGAN' => $this->input->post('TRAYEK_KETERANGAN'),
		);
		$this->model_trayek->update_trayek_by_id($trayek_id,$data_trayek);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletepenjadwalantrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(83);
		
		$this->load->model('model_trayek');
		$trayek_id = $this->input->post('TRAYEK_ID');
		
		$this->model_trayek->delete_trayek_by_id($trayek_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function getpenjadwalantransaksibyharitransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_transaksiangkutsampah');
		
		$hariTransaksiID =  $this->input->get('HARITRANSAKSI_ID');
		
		$all_penjadwalanTransaksi = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_haritransaksi_id_with_haritransaksi_kendaraan_statustransaksi($hariTransaksiID);
		$result = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_haritransaksi_id_with_haritransaksi_kendaraan_statustransaksi($hariTransaksiID);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanTransaksi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}

	public function getpenjadwalandetailtransaksibytransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_detailtransaksiangkutsampah');
		
		$transaksiID =  $this->input->get('TRANSAKSIANGKUTSAMPAH_ID');
		
		$all_penjadwalanDetailTransaksi = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_transaksiangkutsampah_id_with_pengemudi_and_masterdetailtransaksiangkutsampah_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah($transaksiID);
		$result = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_transaksiangkutsampah_id_with_pengemudi_and_masterdetailtransaksiangkutsampah_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah($transaksiID);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanDetailTransaksi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}

	public function getpenjadwalantrayekbydetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(80);
		
		$this->load->model('model_trayek');
		
		$trayekID =  $this->input->get('DETAILTRANSAKSIANGKUTSAMPAH_ID');
		
		$all_penjadwalanTrayek = $this->model_trayek->get_trayek_by_detailtransaksiangkutsampah_id_with_detailtransaksiangkutsampah_and_rute_and_statustrayek($trayekID);
		$result = $this->model_trayek->get_trayek_by_detailtransaksiangkutsampah_id_with_detailtransaksiangkutsampah_and_rute_and_statustrayek($trayekID);
		
		$rows = $result->result_array();
		$recordCount = $all_penjadwalanTrayek->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}

	public function getstatustransaksi(){
		$this->load->model('model_statustransaksiangkutsampah');
		
		$all_statustransaksiangkutsampah = $this->model_statustransaksiangkutsampah->get_all_statustransaksiangkutsampah();
		
		$rows = array();
		if($all_statustransaksiangkutsampah->num_rows()>0){
			foreach($all_statustransaksiangkutsampah->result_array() as $statustransaksiangkutsampah){
				$dummy = array();
				$dummy["DisplayText"] = $statustransaksiangkutsampah["STATUSTRANSAKSIANGKUTSAMPAH_NAMA"];
			    $dummy["Value"] = $statustransaksiangkutsampah["STATUSTRANSAKSIANGKUTSAMPAH_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getstatusdetailtransaksi(){
		$this->load->model('model_statusdetailtransaksiangkutsampah');
		
		$all_statusdetailtransaksiangkutsampah = $this->model_statusdetailtransaksiangkutsampah->get_all_statusdetailtransaksiangkutsampah();
		
		$rows = array();
		if($all_statusdetailtransaksiangkutsampah->num_rows()>0){
			foreach($all_statusdetailtransaksiangkutsampah->result_array() as $statusdetailtransaksiangkutsampah){
				$dummy = array();
				$dummy["DisplayText"] = $statusdetailtransaksiangkutsampah["STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA"];
			    $dummy["Value"] = $statusdetailtransaksiangkutsampah["STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getstatustrayek(){
		$this->load->model('model_statustrayek');
		
		$all_statustrayek = $this->model_statustrayek->get_all_statustrayek();
		
		$rows = array();
		if($all_statustrayek->num_rows()>0){
			foreach($all_statustrayek->result_array() as $statustrayek){
				$dummy = array();
				$dummy["DisplayText"] = $statustrayek["STATUSTRAYEK_NAMA"];
			    $dummy["Value"] = $statustrayek["STATUSTRAYEK_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
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
	
	public function getKendaraanByPool(){
		$poolID = $this->input->post('poolID');
		$this->load->model('model_kendaraan');
		$this->load->model('model_spot');
		
		$all_kendaraan = $this->model_kendaraan->get_kendaraan_by_pool_id($poolID);
		$data = "";
		if($all_kendaraan->num_rows() > 0){
			$data .= "
						<option value=''> </option>
						";
			foreach($all_kendaraan->result() as $kendaraan){				
				$data .= "
							<option value='".$kendaraan->KENDARAAN_ID."'>".$kendaraan->KENDARAAN_NOMORPOLISI."</option>
							";	
			}			
			
		}
		echo $data;
	}
		
	public function getKategoriKendaraanByAplikasi(){
		$aplikasiKendaraanNama = $this->input->post('aplikasiKendaraanNama');
		$this->load->model('model_kategorikendaraan');
		
		$all_kategorikendaraan = $this->model_kategorikendaraan->get_kategorikendaraan_by_aplikasi_nama($aplikasiKendaraanNama);
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