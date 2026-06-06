<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Pemeriksaankendaraan extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(100);
	
		$this->template->set('title','Pemeriksaan Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/pemeriksaankendaraan');
	}

	public function validateKendaraan(){
		$kendaraanNomorPolisi = $this->input->post('kendaraanNomorPolisi');
		//$namaAsalTPS = $this->input->post('namaAsalTPS');
		
		$this->load->model('model_kendaraan');
		$kendaraan = $this->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
		$data = "FALSE";
		if($kendaraan->num_rows>0){
			$rowKendaraan = $kendaraan->row();
			$kendaraanID = $rowKendaraan->KENDARAAN_ID;
			$data = "TRUE";
		}
		echo $data;
		
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
}

?>