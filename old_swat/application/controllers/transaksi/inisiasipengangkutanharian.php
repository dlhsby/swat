<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Inisiasipengangkutanharian extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	private function generateTransaksi($haritransaksi_id,$haritransaksi_tanggal){
		
		$this->load->model('model_masterdetailtransaksiangkutsampah');
		$allmasterDetailTransaksiAngkutSampah = $this->model_masterdetailtransaksiangkutsampah->get_all_masterdetailtransaksiangkutsampah();
		
		if ($allmasterDetailTransaksiAngkutSampah->num_rows() > 0){
			foreach($allmasterDetailTransaksiAngkutSampah->result() as $row){
				$masterDetailTransaksiAngkutSampahID = $row->MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID;
				$kendaraanID = $row->KENDARAAN_ID;
				$pengemudiID = $row->PENGEMUDI_ID;
				$waktuBerangkatKandang = $row->MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG;
				$waktuKembaliKandang = $row->MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG;
				$this->load->model('model_transaksiangkutsampah');
				$data_transaksiangkutsampah = array(
					'HARITRANSAKSI_ID' => $haritransaksi_id,
					'KENDARAAN_ID' => $kendaraanID
				);	
				$this->model_transaksiangkutsampah->insert_transaksiangkutsampah($data_transaksiangkutsampah);
				$transaksiAngkutSampah = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_haritransaksi_id_and_kendaraan_id($haritransaksi_id,$kendaraanID);
				
				if ($transaksiAngkutSampah->num_rows() > 0){
					$this->load->model('model_detailtransaksiangkutsampah');
					foreach($transaksiAngkutSampah->result() as $row1){
						$transaksiAngkutSampahID = $row1->TRANSAKSIANGKUTSAMPAH_ID;
						$data_detailtransaksiangkutsampah = array(
							'TRANSAKSIANGKUTSAMPAH_ID' => $transaksiAngkutSampahID,
							'PENGEMUDI_ID' => $pengemudiID,
							'MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID' => $masterDetailTransaksiAngkutSampahID,
							'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG' => $haritransaksi_tanggal.' '.$waktuBerangkatKandang,
							'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG' => $haritransaksi_tanggal.' '.$waktuKembaliKandang
						);	
						$this->model_detailtransaksiangkutsampah->insert_detailtransaksiangkutsampah($data_detailtransaksiangkutsampah);
						
						$detailTransaksiAngkutSampah = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_transaksiangkutsampah_id($transaksiAngkutSampahID);	
						if ($detailTransaksiAngkutSampah->num_rows() > 0){
							foreach($detailTransaksiAngkutSampah->result() as $row2){
								$detailTransaksiAngkutSampahID = $row2->DETAILTRANSAKSIANGKUTSAMPAH_ID;
								$transaksiCompleteInfo = $this->model_masterdetailtransaksiangkutsampah->get_complete_mastertDetailTransaksi_and_trayek_info_by_masterDetailTransaksiAngkutSampah($masterDetailTransaksiAngkutSampahID);
								if ($transaksiCompleteInfo->num_rows() > 0){
									foreach($transaksiCompleteInfo->result() as $row3){
										$this->load->model('model_trayek');
										
										$data_trayek = array(
											'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $detailTransaksiAngkutSampahID,
											'RUTE_ID' => $row3->RUTE_ID,
											'TRAYEK_NAMA' => $row3->KATEGORIRUTE_NAMA." di ".$row3->SPOT_NAMA,
											'TRAYEK_WAKTUTARGET' => $haritransaksi_tanggal.' '.$row3->MASTERTRAYEK_WAKTUTARGET,
											'TRAYEK_JUMLAHISIBBMDIAJUKAN' => $row3->MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN
										);
										$this->model_trayek->insert_trayek($data_trayek);
										
									}
								}
							}
						}
					}
				}
			}
		}
		
		
	}
	
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(46);
		
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('tanggal','Tanggal','trim|required|callback_haritransaksi_check');
		$this->form_validation->set_error_delimiters('<span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){		
			$this->template->set('title','Inisiasi Transaksi Harian Pengangkutan Sampah | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/inisiasipengangkutanharian');
		}
		else{
			$haritransaksi_tanggal = $this->input->post('tanggal');
			$this->load->model('model_haritransaksi');
			$data_haritransaksi = array(
				'HARITRANSAKSI_TANGGAL' => $haritransaksi_tanggal
			);				
			$this->model_haritransaksi->insert_haritransaksi($data_haritransaksi);
			$haritransaksi = $this->model_haritransaksi->get_haritransaksi_by_tanggal($haritransaksi_tanggal);
			$haritransaksi_id = "";
			if ($haritransaksi->num_rows() > 0)
			{
				$row = $haritransaksi->row(); 
				$haritransaksi_id = $row->HARITRANSAKSI_ID;
				$this->generateTransaksi($haritransaksi_id,$haritransaksi_tanggal);
			}
			redirect('transaksi/penjadwalan/transaksi/'.$haritransaksi_tanggal);
		}
	}

	public function haritransaksi_check($haritransaksi_tanggal){
		$this->load->model('model_haritransaksi');
		$haritransaksi = $this->model_haritransaksi->get_haritransaksi_by_tanggal($haritransaksi_tanggal);
		if ($haritransaksi->num_rows() > 0)
		{
			$this->form_validation->set_message('haritransaksi_check', '%s yang dimasukkan sudah dibuat transaksinya');
			return FALSE;
		}
		else
		{
			return TRUE;
		}
	}

	public function inisiasiswat(){
		date_default_timezone_set('Asia/Jakarta');
		$waktuSekarang = (new \DateTime())->format('H:i:s');
		$tanggalHariIni = (new \DateTime())->format('Y-m-d');
		$this->load->model('model_haritransaksi');
		$haritransaksi = $this->model_haritransaksi->get_haritransaksi_by_tanggal($tanggalHariIni );
		if ($haritransaksi->num_rows() > 0)
		{
			echo 'Gagal';
		}
		else
		{
			$data_haritransaksi = array(
				'HARITRANSAKSI_TANGGAL' => $tanggalHariIni
			);				
			$this->model_haritransaksi->insert_haritransaksi($data_haritransaksi);
			$haritransaksi = $this->model_haritransaksi->get_haritransaksi_by_tanggal($tanggalHariIni);
			$haritransaksi_id = "";
			if ($haritransaksi->num_rows() > 0)
			{
				$row = $haritransaksi->row(); 
				$haritransaksi_id = $row->HARITRANSAKSI_ID;
				$this->generateTransaksi($haritransaksi_id,$tanggalHariIni);
			}
			echo 'Sukses';
		}	
	}
}

?>