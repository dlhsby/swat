<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Pengambilansampah extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(44);
		
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('kendaraan','Nomor Polisi','trim|required');
		$this->form_validation->set_rules('tps','Lokasi TPS Asal Sampah','trim|required');
		$this->form_validation->set_rules('waktu','Waktu Pengambilan Sampah','trim|required');
		$this->form_validation->set_rules('km','Nominal Speedometer','trim|required');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){		
			$this->load->model('model_spot');
			$this->load->model('model_trayek');
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			//$data['all_kendaraan'] = $this->model_trayek->get_scheduled_trayekBBM($tanggalHariIni,3);
			//$data['all_TPS'] = $this->model_spot->get_spot_by_kategorispot(3);
			$this->template->set('title','Pengambilan Sampah TPS | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/pengambilansampah');
		}
		else{
			$nomorPolisi = preg_replace('/\s+/', '', $this->input->post('nopol'));
			$kendaraanNomorPolisi = $this->input->post('kendaraan');
			$waktuPengambilanSampah = $this->input->post('waktu');
			$lokasiTPS = $this->input->post('tps');
			$nominalKm = $this->input->post('km');
			
			$this->load->model('model_kendaraan');
			$this->load->model('model_trayek');
			$this->load->model('model_spot');
			$this->load->model('model_detailtransaksiangkutsampah');
			
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			
			$beratKosongKendaraan = 0;
			$tpsID = 1;
			$kendaraanID = 1;
			
			$kendaraan = $this->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
			if($kendaraan->num_rows >0)
			{
				$rowKendaraan = $kendaraan->row();
				$kendaraanID = $rowKendaraan->KENDARAAN_ID;
				$tps = $this->model_spot->get_spot_by_kategorispot_and_nama(3,$lokasiTPS);
				if($tps->num_rows >0)
				{
					$rowTPS = $tps->row();
					$tpsID = $rowTPS->SPOT_ID;
					$trayekPengambilan = $this->model_trayek->get_trayek_pengambilan($tanggalHariIni,$kendaraanID,$tpsID);
					if($trayekPengambilan->num_rows >0)
					{
						$row = $trayekPengambilan->row();
						$trayekID = $row->trayekID;	
						$data_trayek = array(
							'TRAYEK_WAKTUREALISASI' =>$waktuPengambilanSampah,
							'TRAYEK_KMREALISASI'=> $nominalKm,					
							'STATUSTRAYEK_ID' => 2,
							'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
						);
						$this->model_trayek->update_trayek_by_id($trayekID,$data_trayek);
					}
					else{
						$detailTransaksiTPS = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,1);
						if($detailTransaksiTPS->num_rows >0)
						{
							$row = $detailTransaksiTPS->row();
							$detailTransaksi_ID = $row->DETAILTRANSAKSIANGKUTSAMPAH_ID;	
							$data_trayek = array(
								'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $detailTransaksi_ID,
								'TRAYEK_NAMA' => 'Pengambilan Sampah Tidak Terjadwal di TPS '.$lokasiTPS,
								'RUTE_ID' => 127812,
								'TRAYEK_WAKTUREALISASI' =>$waktuPengambilanSampah,
								'TRAYEK_KMREALISASI'=> $nominalKm,					
								'STATUSTRAYEK_ID' => 2,
								'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
							);
							$this->model_trayek->insert_trayek($data_trayek);
						}
					}
				}
			}
			
			
			redirect('transaksi/pembuangansampah');
		}
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
		
		$all_kendaraan = $this->model_kendaraan->get_kendaraan_by_kategorisumbersampah_id_and_kendaraan_nomorpolisi(1,$keyword); 
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
	
	//upload gambar
	public function uploadgambar(){
		//$tanggal = date("Y-m-d");
		//mkdir("./upload_cctv/$tanggal");
		$uploads_dir = "./upload_cctv";
		if ($_FILES["file"]["error"] == UPLOAD_ERR_OK) {
		    $tmp_name = $_FILES["file"]["tmp_name"];
		    $name = $_FILES["file"]["name"];
		    
		    $splitedName = explode('_', $name);
		    $tanggal = $splitedName[0];
		    $nomorPolisi = $splitedName[1];
		    $idTrayek = $splitedName[2];
		    $indexFilename = $splitedName[3];
		    
		    $newDirectory = "./upload_cctv/".$tanggal."/".$nomorPolisi;
		    mkdir($newDirectory,0777, true);
		    
		    $newFilename = $idTrayek."_".$indexFilename;
		    
		    $fullPath = $newDirectory."/".$newFilename;
		    
		    //move_uploaded_file($tmp_name, "$uploads_dir/$tanggal/$name");
		    move_uploaded_file($tmp_name, "$newDirectory/$newFilename");
		    
		    $this->load->model('model_dokumentasitrayek');
		    $data_dokumentasiTrayek = array(
				'TRAYEK_ID' => $idTrayek,
				'DOKUMENTASITRAYEK_FOTO' => $fullPath
			);
			$this->model_dokumentasitrayek->insert_dokumentasitrayek($data_dokumentasiTrayek);
		}
	}
}

?>