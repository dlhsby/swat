<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Jatahkitir extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(101);
		
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('kendaraan','Nomor Polisi','trim|required');
		$this->form_validation->set_rules('tps','Persil Sampah','trim|required');
		$this->form_validation->set_rules('awalmasaberlakuwaktu','Awal Masa Berlaku Kitir','trim|required');
		$this->form_validation->set_rules('akhirmasaberlakuwaktu','Akhir Masa Berlaku Kitir','trim|required');
		$this->form_validation->set_rules('jumlahkitir','Jumlah Kitir','trim|required');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){
			$this->load->model('model_spot');
			$this->load->model('model_kendaraan');
			$this->load->model('model_statusjatahkitir');
			
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			
			$data['all_TPS'] = $this->model_spot->get_spot_by_kategorispot(3);
			$data['all_statusjatahkitir'] = $this->model_statusjatahkitir->get_all_statusjatahkitir();
			$data['tanggalHariIni'] = $tanggalHariIni;
			$this->template->set('title','Penerbitan Jatah Kitir | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/jatahkitir',$data);
		}
		else{
			$kendaraanNomorPolisi = preg_replace('/\s+/', '', $this->input->post('kendaraan'));
			$lokasiTPS = $this->input->post('tps');
			$awalmasaberlakuwaktu = $this->input->post('awalmasaberlakuwaktu');
			$akhirmasaberlakuwaktu = $this->input->post('akhirmasaberlakuwaktu');
			$jumlahkitir = $this->input->post('jumlahkitir');
			
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			$tpsID = 1;
			$kendaraanID = 1;							
			
			$this->load->model('model_kendaraan');
			$this->load->model('model_spot');
			$this->load->model('model_jatahkitir');
			$kendaraan = $this->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
			if($kendaraan->num_rows >0)
			{
				$rowKendaraan = $kendaraan->row();
				$kendaraanID = $rowKendaraan->KENDARAAN_ID;
				$kategoriSumberSampahID = $rowKendaraan->KATEGORISUMBERSAMPAH_ID;
				$tps = $this->model_spot->get_spot_pembuangan_by_kategorispot_and_nama(3,$lokasiTPS);
				if($tps->num_rows >0)
				{
					$rowTPS = $tps->row();
					$tpsID = $rowTPS->SPOT_ID;
					$data_jatahkitir = array(
						'KENDARAAN_ID' => $kendaraanID,
						'SPOT_ID' => $tpsID,
						'STATUSJATAHKITIR_ID' => 1,
						'JATAHKITIR_WAKTUDITERBITKAN' => $tanggalHariIni.' '.$waktuSekarang,
						'JATAHKITIR_MASABERLAKUAWAL' => $awalmasaberlakuwaktu,
						'JATAHKITIR_MASABERLAKUAKHIR' => $akhirmasaberlakuwaktu
						
					);
					for($i = 0; $i < $jumlahkitir; $i++){
						$this->model_jatahkitir->insert_jatahkitir($data_jatahkitir);
					}
				}
			}
			redirect('transaksi/jatahkitir');
		}
	}
	
	public function getAllJatahKitirByFilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(101);

		$this->load->model('model_jatahkitir');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$tanggalDiterbitkan = $this->input->post('tanggalDiterbitkan');
		if($this->input->post('tanggalDiterbitkan')=='____-__-__'){
			$tanggalDiterbitkan=NULL;
		}
		$nopolKendaraan = $this->input->post('nopolKendaraan');
		$tps = $this->input->post('tpsList');
		$statusJatahKitir = $this->input->post('statusJatahKitir');
		$idJatahKitir = $this->input->post('idJatahKitir');
		
		
		
		$all_jatahkitir = $this->model_jatahkitir->get_all_jatahkitir_by_filter($idJatahKitir,$tanggalDiterbitkan,$nopolKendaraan,$tps,$statusJatahKitir);
		$result = $this->model_jatahkitir->get_all_paging_sorting_jatahkitir_by_filter($idJatahKitir,$tanggalDiterbitkan,$nopolKendaraan,$tps,$statusJatahKitir,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_jatahkitir->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function gettps(){
		$keyword = $this->input->get('query');
		$this->load->model('model_spot');
		
		$all_tps = $this->model_spot->get_spot_by_kategorispot_and_nama(3,$keyword);
		foreach($all_tps->result() as $row)
		{
			$arr['query'] = $keyword;
			$arr['suggestions'][] = array(
				'value'  =>$row->SPOT_NAMA,
				'data'   =>$row->SPOT_ID
			);
		}
		echo json_encode($arr);
	}
	
	public function getkendaraan(){
		$keyword = $this->input->get('query');
		$this->load->model('model_kendaraan');
		
		$all_kendaraan = $this->model_kendaraan->get_kendaraan_by_nomorkendaraan($keyword); 
		foreach($all_kendaraan->result() as $row)
		{
			$arr['query'] = $keyword;
			$arr['suggestions'][] = array(
				'value'  =>$row->KENDARAAN_NOMORPOLISI,
				'data'   =>$row->KENDARAAN_ID
			);
		}
		echo json_encode($arr);
	}

	public function getlistkendaraan(){
		$this->load->model('model_kendaraan');
		
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
	
	public function getlistpersil(){
		$this->load->model('Model_spot');
		
		$all_spot= $this->Model_spot->get_spot_by_kategorispot(3);
		
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
	
	public function getliststatusjatahkitir(){
		$this->load->model('model_statusjatahkitir');
		
		$all_statusjatahkitir = $this->model_statusjatahkitir->get_all_statusjatahkitir();
		
		$rows = array();
		if($all_statusjatahkitir->num_rows()>0){
			foreach($all_statusjatahkitir->result_array() as $statusjatahkitir){
				$dummy = array();
				$dummy["DisplayText"] = $statusjatahkitir["STATUSJATAHKITIR_NAMA"];
			    $dummy["Value"] = $statusjatahkitir["STATUSJATAHKITIR_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function updatejatahkitir(){
		$this->auth->restrict();
		$this->auth->cek_menu(101);
		
		$this->load->model('model_jatahkitir');
		$jatahkitir_id = $this->input->post('JATAHKITIR_ID');
		
		$data_jatahkitir = array(
			'KENDARAAN_ID' => $this->input->post('KENDARAAN_ID'),
			'SPOT_ID' => $this->input->post('SPOT_ID'),
			'STATUSJATAHKITIR_ID' => $this->input->post('STATUSJATAHKITIR_ID'),
			'JATAHKITIR_MASABERLAKUAWAL' => $this->input->post('JATAHKITIR_MASABERLAKUAWAL'),
			'JATAHKITIR_MASABERLAKUAKHIR' => $this->input->post('JATAHKITIR_MASABERLAKUAKHIR')
		);
		$this->model_jatahkitir->update_jatahkitir_by_id($jatahkitir_id,$data_jatahkitir);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
}