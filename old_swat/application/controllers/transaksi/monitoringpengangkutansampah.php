<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Monitoringpengangkutansampah extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(47);
		
		$this->load->model('model_haritransaksi');
		
		$hariTransaksiTanggal = $this->uri->segment(4);
		
		if($hariTransaksiTanggal== "")
			$data['all_hariTransaksi'] = $this->model_haritransaksi->get_all_haritransaksi_with_statusharitransaksi();
		else
			$data['all_hariTransaksi'] = $this->model_haritransaksi->get_haritransaksi_by_tanggal_with_statusharitransaksi($hariTransaksiTanggal);

		$this->template->set('title','Monitoring Pengangkutan Sampah | SWAT DKP');
		$this->template->load('template','transaksi/monitoringpengangkutansampah/index',$data);
	}
	
	public function monitoringtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(53);
		
		$this->load->model('model_transaksiangkutsampah');
		
		$hariTransaksiTanggal = $this->uri->segment(4);
		
		$data['hariTransaksiTanggal'] = $hariTransaksiTanggal;
		
		if($hariTransaksiTanggal== "")
			$data['all_transaksi'] = $this->model_transaksiangkutsampah->get_all_transaksiangkutsampah_with_haritransaksi_and_status_and_kendaraan();
		else
			$data['all_transaksi'] = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_haritransaksi_tanggal_with_haritransaksi_kendaraan_statustransaksi($hariTransaksiTanggal);
		
		$this->template->set('title','Monitoring Transaksi Pengangkutan Sampah | SWAT DKP');
		$this->template->load('template','transaksi/monitoringpengangkutansampah/monitoringtransaksi/index',$data);
	}
	
	public function tambahtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(56);
		
		$this->load->library('form_validation');
		$this->load->model('model_haritransaksi');
		$this->load->model('model_transaksiangkutsampah');
		$this->load->model('model_statustransaksiangkutsampah');
		$this->load->model('model_kendaraan');
		$this->load->model('model_spot');
		
		$this->form_validation->set_rules('haritransaksi','Hari Transaksi Tanggal','trim|required');
		$this->form_validation->set_rules('kendaraan','Nomor Polisi Kendaraan','trim|required');
		$this->form_validation->set_rules('statustransaksi','Status Transaksi','trim|required');
		$this->form_validation->set_rules('keterangan','Keterangan','trim');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){
			$hariTransaksiTanggal = $this->uri->segment(4);			
			$data['hariTransaksiTanggal'] = $hariTransaksiTanggal;
			$data['all_haritransaksi'] = $this->model_haritransaksi->get_all_haritransaksi();
			$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
			$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan();
			$data['all_statustransaksiangkutsampah'] = $this->model_statustransaksiangkutsampah->get_all_statustransaksiangkutsampah();
			
			$this->template->set('title','Tambah Data Pengemudi Baru | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/monitoringpengangkutansampah/monitoringtransaksi/tambahtransaksi',$data);
		}
		else{
			$hariTransaksiTanggal = $this->input->post('haritransaksi');
			$hariTransaksi = $this->model_haritransaksi->get_haritransaksi_by_tanggal($hariTransaksiTanggal);
			
			if($hariTransaksi->num_rows()>0){
				$row1 = $hariTransaksi->row();
				$hariTransaksiID = $row1->HARITRANSAKSI_ID;
				$data_transaksi = array(
					'HARITRANSAKSI_ID' => $hariTransaksiID,
					'KENDARAAN_ID' => $this->input->post('kendaraan'),
					'STATUSTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('statustransaksi'),
					'TRANSAKSIANGKUTSAMPAH_KETERANGAN' => $this->input->post('keterangan')
				);
				$this->model_transaksiangkutsampah->insert_transaksiangkutsampah($data_transaksi);	
				redirect('transaksi/monitoringpengangkutansampah/monitoringtransaksi/'.$hariTransaksiTanggal);
			}
			else
				redirect('transaksi/monitoringpengangkutansampah/monitoringtransaksi');
		}
		
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
	
	public function monitoringdetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(54);
		
		$this->load->model('model_detailtransaksiangkutsampah');
		
		$transaksiID = $this->uri->segment(4);
		
		$data['transaksiID'] = $transaksiID;
		
		if($transaksiID== "")
			$data['all_detailtransaksi'] = $this->model_detailtransaksiangkutsampah->get_all_detailtransaksiangkutsampah_with_pengemudi_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah();
		else
			$data['all_detailtransaksi'] = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_transaksiangkutsampah_id_with_pengemudi_and_masterdetailtransaksiangkutsampah_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah($transaksiID);
		
		$this->template->set('title','Monitoring Detail Transaksi Pengangkutan Sampah | SWAT DKP');
		$this->template->load('template','transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi/index',$data);
	}
	
	public function tambahdetailtransaksi(){
		$this->auth->restrict();
		$this->auth->cek_menu(57);
		
		$this->load->library('form_validation');
		$this->load->model('model_transaksiangkutsampah');
		$this->load->model('model_detailtransaksiangkutsampah');
		$this->load->model('model_pengemudi');
		$this->load->model('model_statusdetailtransaksiangkutsampah');
		
		$this->form_validation->set_rules('transaksi','Transaksi','trim|required');
		$this->form_validation->set_rules('pengemudi','Pengemudi','trim|required');
		$this->form_validation->set_rules('kmtargetberangkat','kmtargetberangkat','trim');
		$this->form_validation->set_rules('kmrealisasiberangkat','kmrealisasiberangkat','trim');
		$this->form_validation->set_rules('kmtargetkembali','kmtargetkembali','trim');
		$this->form_validation->set_rules('kmrealisasikembali','kmrealisasikembali','trim');
		$this->form_validation->set_rules('waktutargetberangkat','waktutargetberangkat','trim|required');
		$this->form_validation->set_rules('wakturealisasiberangkat','wakturealisasiberangkat','trim');
		$this->form_validation->set_rules('waktutargetkembali','waktutargetkembali','trim|required');
		$this->form_validation->set_rules('wakturealisasikembali','wakturealisasikembali','trim');
		$this->form_validation->set_rules('statusdetailtransaksi','Status Detail Transaksi','trim|required');
		$this->form_validation->set_rules('keterangan','Keterangan','trim');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){
			$transaksiID = $this->uri->segment(4);			
			$data['transaksiID'] = $transaksiID;
			
			$transaksiByID = $this->model_transaksiangkutsampah->get_transaksiangkutsampah_by_transaksi_id_with_haritransaksi_and_status_and_kendaraan($transaksiID);
			$poolID = 0;
			if($transaksiByID->num_rows()>0){
				$rowTransaksi = $transaksiByID->row(); 
			   	$poolID = $rowTransaksi->SPOT_POOL_ID;
			}
			
			$data['all_transaksi'] = $this->model_transaksiangkutsampah->get_all_transaksiangkutsampah();
			$data['all_pengemudi'] = $this->model_pengemudi->get_pengemudi_by_pool($poolID);
			$data['all_statusdetailtransaksiangkutsampah'] = $this->model_statusdetailtransaksiangkutsampah->get_all_statusdetailtransaksiangkutsampah();
			
			$this->template->set('title','Tambah Detail Transaksi Pengangkutan Sampah | SWAT DKP');
			$this->template->load('template','transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi/tambahdetailtransaksi',$data);
		}
		else{
			$transaksiID = $this->input->post('transaksi');
			$data_detailtransaksi = array(
				'TRANSAKSIANGKUTSAMPAH_ID' => $transaksiID,
				'PENGEMUDI_ID' => $this->input->post('pengemudi'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG' => $this->input->post('kmtargetberangkat'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG' => $this->input->post('kmrealisasiberangkat'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG' => $this->input->post('kmtargetkembali'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG' => $this->input->post('kmrealisasiberangkat'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG' => $this->input->post('waktutargetberangkat'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG' => $this->input->post('wakturealisasiberangkat'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG' => $this->input->post('waktutargetkembali'),
				'DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG' => $this->input->post('wakturealisasikembali'),
				'STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('statusdetailtransaksi'),
				'DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN' => $this->input->post('keterangan')
			);
			$this->model_detailtransaksiangkutsampah->insert_detailtransaksiangkutsampah($data_detailtransaksi);
			redirect('transaksi/monitoringpengangkutansampah/monitoringdetailtransaksi/'.$transaksiID);
		}		
	}
	
	public function monitoringtrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(55);
		
		$this->load->model('model_trayek');
		
		$detailTransaksiID = $this->uri->segment(4);
		
		$data['detailTransaksiID'] = $detailTransaksiID;
		
		if($detailTransaksiID== "")
			$data['all_trayek'] = $this->model_trayek->get_all_trayek_with_detailtransaksiangkutsampah_and_rute_and_statustrayek();
		else
			$data['all_trayek'] = $this->model_trayek->get_trayek_by_detailtransaksiangkutsampah_id_with_detailtransaksiangkutsampah_and_rute_and_statustrayek($detailTransaksiID);
		
		$this->template->set('title','Monitoring Trayek Pengangkutan Sampah | SWAT DKP');
		$this->template->load('template','transaksi/monitoringpengangkutansampah/monitoringtrayek/index',$data);
	}
	
	public function tambahtrayek(){
		$this->auth->restrict();
		$this->auth->cek_menu(58);
		
		$this->load->library('form_validation');
		$this->load->model('model_detailtransaksiangkutsampah');
		$this->load->model('model_kategorirute');
		$this->load->model('model_trayek');
		$this->load->model('model_rute');
		$this->load->model('model_statustrayek');
		
		$this->form_validation->set_rules('detailtransaksi','Transaksi','trim|required');
		$this->form_validation->set_rules('kategorirute','Kategori Rute','trim');
		$this->form_validation->set_rules('rute','Rute','trim|required');
		$this->form_validation->set_rules('waktutarget','Waktu Target','trim');
		$this->form_validation->set_rules('wakturealisasi','Waktu Target','trim');
		$this->form_validation->set_rules('kmtarget','KM Target','trim');
		$this->form_validation->set_rules('bbmdiajukan','BBM Diajukan','trim');
		$this->form_validation->set_rules('statustrayek','Status Trayek','trim|required');
		$this->form_validation->set_rules('keterangan','Keterangan','trim');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){
			$detailTransaksiID = $this->uri->segment(4);			
			$data['detailTransaksiID'] = $detailTransaksiID;
			$data['all_detailtransaksi'] = $this->model_detailtransaksiangkutsampah->get_all_detailtransaksiangkutsampah();
			$data['all_kategorirute'] = $this->model_kategorirute->get_all_kategorirute();
			
			$data['all_statustrayek'] = $this->model_statustrayek->get_all_statustrayek();
			$data['all_rute'] = $this->model_rute->get_all_rute_with_spot_asal_and_spot_tujuan_and_kategorirute_nama();
			$this->template->set('title','Tambah Trayek Pengangkutan Sampah | SWAT DKP');
			$this->template->load('template','transaksi/monitoringpengangkutansampah/monitoringtrayek/tambahtrayek',$data);
		}
		else{
			$detailTransaksiAngkutSampah = $this->input->post('detailtransaksi');
			
			$rute_id = $this->input->post('rute');
			$ruteByID = $this->model_rute->get_rute_by_rute_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($rute_id);
			$rute_tujuan = "";
			if($ruteByID->num_rows() > 0){
				$row = $ruteByID->row(); 
			   	$rute_tujuan = $row->RUTE_TUJUAN;
			}
			
			$kategorirute_id = $this->input->post('kategorirute');
			$kategoriruteByID = $this->model_kategorirute->get_kategorirute_by_id($kategorirute_id);
			$kategorirute_nama = "";
			if($kategoriruteByID->num_rows() > 0){
				$row = $ruteByID->row(); 
			   	$kategorirute_nama = $row->KATEGORIRUTE_NAMA;
			}
			
			$data_trayek = array(
				'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $this->input->post('detailtransaksi'),			
				'RUTE_ID' => $rute_id,
				'TRAYEK_NAMA' => $kategorirute_nama." di ". $rute_tujuan,
				'TRAYEK_WAKTUTARGET' => $this->input->post('waktutarget'),
				'TRAYEK_WAKTUREALISASI' => $this->input->post('wakturealisasi'),
				'TRAYEK_KMTARGET' => $this->input->post('kmtarget'),
				'TRAYEK_JUMLAHISIBBMDIAJUKAN' => $this->input->post('bbmdiajukan'),
				'STATUSTRAYEK_ID' => $this->input->post('statustrayek'),
				'TRAYEK_KETERANGAN' => $this->input->post('keterangan')
			);
			$this->model_trayek->insert_trayek($data_trayek);
			redirect('transaksi/monitoringpengangkutansampah/monitoringtrayek/'.$detailTransaksiAngkutSampah);
		}		
	}

	public function getRuteByKategoriRute(){
		$kategoriRuteID = $this->input->post('kategoriRuteID');
		$this->load->model('model_rute');
		$this->load->model('model_spot');
		
		$all_rute = $this->model_rute->get_rute_by_kategorirute_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($kategoriRuteID);
		$data = "";
		if($all_rute->num_rows() > 0){
			$data .= "
						<option value=''> </option>
						";
			foreach($all_rute->result() as $rute){
				$ruteID = $rute->RUTE_ID;
				$ruteAsalID = $rute->RUTE_ASAL_ID;
				$ruteTujuanID = $rute->RUTE_TUJUAN_ID;
				
				$kategoriRuteAsal = $this->model_spot->get_spot_by_id_with_spot_kategori($ruteAsalID);
				$kategoriRuteTujuan = $this->model_spot->get_spot_by_id_with_spot_kategori($ruteTujuanID);
				$kategoriRuteAsalNama = "Kosong";
				$kategoriRuteTujuanNama = "Kosong2";
				if($kategoriRuteAsal->num_rows()>0 && $kategoriRuteTujuan->num_rows()>0){
					$row2 = $kategoriRuteAsal->row(); 
					$row3 = $kategoriRuteTujuan->row(); 
				   	$kategoriRuteAsalNama = $row2->KATEGORISPOT_NAMA;
					$kategoriRuteTujuanNama = $row3->KATEGORISPOT_NAMA;
				}
				
				$data .= "
							<option value='".$rute->RUTE_ID."'>".$kategoriRuteAsalNama." ".$rute->RUTE_ASAL." ke ".$kategoriRuteTujuanNama." ".$rute->RUTE_TUJUAN."</option>
							";	
			}			
			
		}
		echo $data;
	}
}

?>