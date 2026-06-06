<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Aktivitaspool extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(48);
		
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('pool','Lokasi Pool','trim|required');
		$this->form_validation->set_rules('jenisAktivitas','Jenis Aktivitas','trim|required');
		$this->form_validation->set_rules('kendaraan','Nomor Polisi','trim|required');
		$this->form_validation->set_rules('km','Nominal Speedometer','trim|required');
		$this->form_validation->set_rules('waktuAktivitas','Waktu Aktivitas','trim|required');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){		
			$this->load->model('model_spot');
			$this->load->model('model_kendaraan');
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
			$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan();
			$this->template->set('title','Pencatatan Aktivitas Pool | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/aktivitaspool',$data);
		}
		else{
			$lokasiPool = $this->input->post('pool');
			$jenisAktivitas = $this->input->post('jenisAktivitas');			
			$kendaraanID = $this->input->post('kendaraan');
			$waktuAktivitas = $this->input->post('waktuAktivitas');
			$nominalKm = $this->input->post('km');
			$kategoriRute = 0;
			if($jenisAktivitas == 1){
				$kategoriRute = 1;
			}
			elseif ($jenisAktivitas == 2){
				$kategoriRute = 5;
			}
			
			
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			
			$this->load->model('model_trayek');
			$trayekAktivitasPool = $this->model_trayek->get_trayek_aktivitaspool($tanggalHariIni,$kendaraanID,$kategoriRute,$lokasiPool);
			if($trayekAktivitasPool->num_rows >0)
			{
				$row = $trayekAktivitasPool->row();
				$trayekID = $row->trayekID;	
				$data_trayek = array(
					'TRAYEK_WAKTUREALISASI' =>$waktuAktivitas,
					'TRAYEK_KMREALISASI'=> $nominalKm,					
					'STATUSTRAYEK_ID' => 2
				);
				$this->model_trayek->update_trayek_by_id($trayekID,$data_trayek);
				
			}
			redirect('transaksi/aktivitaspool');
		}
	}
	
	public function getKendaraanByPool(){
		$poolID = $this->input->post('poolID');
		$kategoriRute = $this->input->post('kategoriRute');
		date_default_timezone_set('Asia/Jakarta');
		$waktuSekarang = (new \DateTime())->format('H:i:s');
		$tanggalHariIni = (new \DateTime())->format('Y-m-d');
		$this->load->model('model_trayek');
		
		$all_scheduledTrayek = $this->model_trayek->get_scheduled_trayek($tanggalHariIni,$kategoriRute,$poolID);
		$data = "";
		if($all_scheduledTrayek->num_rows() > 0){
			$data .= "
						<option value=''> </option>
						";
			foreach($all_scheduledTrayek->result() as $scheduledTrayek){				
				$data .= "
							<option value='".$scheduledTrayek->kendaraanID."'>".$scheduledTrayek->kendaraanNopol."</option>
							";	
			}			
			
		}
		echo $data;
	}
}

?>