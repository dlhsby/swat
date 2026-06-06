<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Pengisianbahanbakar extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(43);
		
		$this->load->library('form_validation');
		
		$this->form_validation->set_rules('kendaraan','Nomor Polisi','trim|required');
		$this->form_validation->set_rules('bbm','Nominal Isi BBM','trim|required');
		$this->form_validation->set_rules('km','Nominal Speedometer','trim|required');
		$this->form_validation->set_rules('waktu','Waktu Pengisian Bahan Bakar','trim|required');
		$this->form_validation->set_rules('keterangan','Keterangan','trim');
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){		
			$this->load->model('model_trayek');
			$this->load->model('model_kendaraan');
			$this->load->model('model_bahanbakar');
			$this->load->model('model_statustrayek');
			$this->load->model('model_aplikasikendaraan');
			$this->load->model('model_kategorikendaraan');
			
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			//$data['all_kendaraan'] = $this->model_trayek->get_scheduled_trayekBBM($tanggalHariIni,2);
			//$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan();
			$data['all_bahanbakar'] = $this->model_bahanbakar->get_all_bahanbakar();
			$data['all_statustrayek'] = $this->model_statustrayek->get_all_statustrayek();
			$data['all_aplikasikendaraan'] = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
			$data['all_kategorikendaraan'] = $this->model_kategorikendaraan->get_all_kategorikendaraan();
			$data['tanggalHariIni'] = $tanggalHariIni;
			$this->template->set('title','Pengisian Bahan Bakar | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/pengisianbahanbakar',$data);
		}
		else{
			//$string = preg_replace('/\s+/', '', $string);
			$nomorPolisi = preg_replace('/\s+/', '', $this->input->post('nopol'));
			$kendaraanNomorPolisi = $this->input->post('kendaraan');
			$nominalBBM = $this->input->post('bbm');
			$nominalKm = $this->input->post('km');
			$waktuPengisianBahanBakar = $this->input->post('waktu');
			$keteranganPengisianBahanBakar = $this->input->post('keterangan');
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			
			$this->load->model('model_kendaraan');
			$this->load->model('model_trayek');
			$this->load->model('model_detailtransaksiangkutsampah');
			
			$kendaraan = $this->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
			$kendaraanID = 1;
			if($kendaraan->num_rows >0)
			{
				$rowKendaraan = $kendaraan->row();
				$kendaraanID = $rowKendaraan->KENDARAAN_ID;
				$trayekBBm = $this->model_trayek->get_trayek_BBM($tanggalHariIni,$kendaraanID);
				if($trayekBBm->num_rows >0)
				{
					$row = $trayekBBm->row();
					$trayekID = $row->trayekID;	
					$data_trayek = array(
						'TRAYEK_JUMLAHISIBBMDISETUJUI' =>$nominalBBM,
						'TRAYEK_WAKTUREALISASI' =>$waktuPengisianBahanBakar,
						'TRAYEK_KMREALISASI'=> $nominalKm,
						'STATUSTRAYEK_ID' => 2,
						'TRAYEK_KETERANGAN' => $keteranganPengisianBahanBakar,
						'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
					);
					
					$this->model_trayek->update_trayek_by_id($trayekID,$data_trayek);	
				}
				else{
					
					$detailTransaksiBBM = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,1);
					if($detailTransaksiBBM->num_rows >0)
					{
						$row = $detailTransaksiBBM->row();
						$detailTransaksi_ID = $row->DETAILTRANSAKSIANGKUTSAMPAH_ID;	
						$data_trayek = array(
							'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $detailTransaksi_ID,
							'TRAYEK_NAMA' => 'Pengisian BBM di SPBU Tidak Terjadwal',
							'RUTE_ID' => 127810,
							'TRAYEK_JUMLAHISIBBMDISETUJUI' =>$nominalBBM,
							'TRAYEK_WAKTUREALISASI' =>$waktuPengisianBahanBakar,
							'TRAYEK_KMREALISASI'=> $nominalKm,
							'STATUSTRAYEK_ID' => 2,
							'TRAYEK_KETERANGAN' => $keteranganPengisianBahanBakar,
							'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
						);
						$this->model_trayek->insert_trayek($data_trayek);
					}
				}	
			}
			
			redirect('transaksi/pengisianbahanbakar');
		}
	}

	public function getpenggunaanbahanbakarbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(43);

		$this->load->model('model_trayek');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$tanggalTransaksi = $this->input->post('tanggalTransaksi');
		$nopolKendaraan = $this->input->post('nopolKendaraan');
		$aplikasiKendaraan = $this->input->post('aplikasiKendaraan');
		$kategoriKendaraan = $this->input->post('kategoriKendaraan');
		$bahanBakar = $this->input->post('bahanBakar');
		$statusTrayek = 2;
		
		
		$all_penggunaanbahanbakar = $this->model_trayek->get_all_trayek_penggunaanbahanbakar_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar,$statusTrayek);
		$result = $this->model_trayek->get_all_paging_sorting_trayek_penggunaanbahanbakar_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penggunaanbahanbakar->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
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
																	
	public function updatetrayekpenggunaanbahanbakar(){
		$this->auth->restrict();
		$this->auth->cek_menu(83);
		$this->load->model('model_trayek');
		
		$trayek_id = $this->input->post('TRAYEK_ID');
		date_default_timezone_set('Asia/Jakarta');
		$waktuSekarang = (new \DateTime())->format('H:i:s');
		$tanggalHariIni = (new \DateTime())->format('Y-m-d');
		$data_trayek = array(
			'TRAYEK_KMREALISASI' => $this->input->post('TRAYEK_KMREALISASI'),
			'TRAYEK_WAKTUREALISASI' => $this->input->post('TRAYEK_WAKTUREALISASI'),
			'TRAYEK_JUMLAHISIBBMDISETUJUI' => $this->input->post('JUMLAHBBMDISETUJUI'),
			'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang,
			'TRAYEK_KETERANGAN' => $this->input->post('TRAYEK_KETERANGAN'),
			
		);
		$this->model_trayek->update_trayek_by_id($trayek_id,$data_trayek);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletetrayekpenggunaanbahanbakar(){
		$this->auth->restrict();
		$this->auth->cek_menu(43);
		
		$this->load->model('model_trayek');
		$trayek_id = $this->input->post('TRAYEK_ID');
		
		$this->model_trayek->delete_trayek_by_id($trayek_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
}

?>