<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Pembuangansampah extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(45);

		$this->load->library('form_validation');
		
		$this->form_validation->set_message('required', 'Kolom Ini Wajib Diisi');
		$this->form_validation->set_rules('kendaraan','Nomor Polisi','trim|required');
		$this->form_validation->set_rules('tps','Lokasi TPS Asal Sampah','trim|required');
		$this->form_validation->set_rules('beratkotor','Berat Kotor Timbangan','trim|required');
		$this->form_validation->set_rules('beratkosong','Berat Kosong Kendaraan','trim|required');
		$this->form_validation->set_rules('beratbersih','Berat Bersih Sampah','trim|required');
		$this->form_validation->set_rules('km','Nominal Speedometer','trim|required');
		$this->form_validation->set_rules('volume','Volume Sampah','trim');
		$this->form_validation->set_rules('waktu','Waktu Pembuangan Sampah','trim|required');
		$this->form_validation->set_rules('keterangan','Keterangan','trim');

		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');

		if($this->form_validation->run()==FALSE){
			$this->load->model('model_spot');
			$this->load->model('model_kendaraan');
			$this->load->model('model_trayek');
			$this->load->model('model_statustrayek');
			$this->load->model('model_aplikasikendaraan');
			$this->load->model('model_kategorikendaraan');

			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');
			//$data['all_kendaraan'] = $this->model_trayek->get_scheduled_trayekBBM($tanggalHariIni,4);
			$data['all_TPS'] = $this->model_spot->get_spot_by_kategorispot(3);
			$data['all_statustrayek'] = $this->model_statustrayek->get_all_statustrayek();
			$data['all_aplikasikendaraan'] = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
			$data['all_kategorikendaraan'] = $this->model_kategorikendaraan->get_all_kategorikendaraan();
			$data['tanggalHariIni'] = $tanggalHariIni;
			$this->template->set('title','Pembuangan Sampah TPA | SWAT DKP Surabaya');
			$this->template->load('template','transaksi/pembuangansampah',$data);
		}
		else{

			$nomorPolisi = preg_replace('/\s+/', '', $this->input->post('nopol'));
			$kendaraanNomorPolisi = preg_replace('/\s+/', '', $this->input->post('kendaraan'));
			$beratKotorTimbangan = $this->input->post('beratkotor');
			$beratKosongKendaraan = 0;
			$beratKosongKendaraan = $this->input->post('beratkosong');
			$beratBersihSampah = $this->input->post('beratbersih');
			$volumeSampah = 0;
			$lokasiTPS = $this->input->post('tps');
			$nominalKm = $this->input->post('km');
			$waktuPembuanganSampah = $this->input->post('waktu');
			$keterangan = $this->input->post('keterangan');
			$idPengguna = $this->session->userdata('pengguna_id');

			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');

			$tpsID = 1;
			$kendaraanID = 1;

			$this->load->model('model_kendaraan');
			$this->load->model('model_trayek');
			$this->load->model('model_spot');
			$this->load->model('model_detailtransaksiangkutsampah');
			$this->load->model('model_rute');
			$this->load->model('model_dokumentasitrayek');
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
					$trayekPembuangan = $this->model_trayek->get_trayek_pembuangan($tanggalHariIni,$kendaraanID,$tpsID);
					$trayekID = 0;
					if($trayekPembuangan->num_rows >0)
					{
						$rowTrayek = $trayekPembuangan->row();
						$trayekID = $rowTrayek->trayekID;
						$data_trayek = array(
							'TRAYEK_WAKTUREALISASI' =>$waktuPembuanganSampah,
							'TRAYEK_KMREALISASI'=> $nominalKm,
							'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
							'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
							'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
							//'TRAYEK_VOLUMESAMPAH'=> $volumeSampah,
							'STATUSTRAYEK_ID' => 2,
							'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang,
							'PENGGUNA_ID'=> $idPengguna,
							'TRAYEK_KETERANGAN' => $keterangan
						);
						$this->model_trayek->update_trayek_by_id($trayekID,$data_trayek);
					}
					else{
						$detailTransaksiTPA = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,1);
						if($detailTransaksiTPA->num_rows >0)
						{
							$rowDetailTransaksi = $detailTransaksiTPA->row();
							$detailTransaksi_ID = $rowDetailTransaksi->DETAILTRANSAKSIANGKUTSAMPAH_ID;
							$tpaID = 4;
							$rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($tpsID,$tpaID);
							$ruteID = 127811;
							if($rute->num_rows > 0){
								$rowRute = $rute->row();
								$ruteID = $rowRute->RUTE_ID;
							}
							$data_trayek = array(
								'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $detailTransaksi_ID,
								'TRAYEK_NAMA' => 'Pembuangan Sampah Tidak Terjadwal dari TPS '.$lokasiTPS.' ke TPA',
								'RUTE_ID' => $ruteID,
								'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
								'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
								'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
								//'TRAYEK_VOLUMESAMPAH'=> $volumeSampah,
								'TRAYEK_WAKTUREALISASI' =>$waktuPembuanganSampah,
								'TRAYEK_KMREALISASI'=> $nominalKm,
								'STATUSTRAYEK_ID' => 2,
								'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang,
								'PENGGUNA_ID'=> $idPengguna,
								'TRAYEK_KETERANGAN' => $keterangan
							);
							$this->model_trayek->insert_trayek($data_trayek);
							$lastInsertedTrayek = $this->model_trayek->get_last_inserted_trayek();
							$rowlastInsertedTrayek = $lastInsertedTrayek->row();
							$trayekID = $rowlastInsertedTrayek->TRAYEK_ID;

						}
					}
				}
				if($kategoriSumberSampahID==1)
					redirect('transaksi/pengambilansampah');
				else
					redirect('transaksi/pembuangansampah');
			}

		}
	}

	public function getpembuangansampahbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(45);

		$this->load->model('model_trayek');

		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');

		$tanggalTransaksi = $this->input->post('tanggalTransaksi');
		$nopolKendaraan = $this->input->post('nopolKendaraan');
		$aplikasiKendaraan = $this->input->post('aplikasiKendaraan');
		$kategoriKendaraan = $this->input->post('kategoriKendaraan');
		$tps = $this->input->post('tpsList');
		//$statusTrayek = 2;
		$statusTrayek = $this->input->post('statusTrayek');


		$all_pembuangansampah = $this->model_trayek->get_all_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek);
		$result = $this->model_trayek->get_all_paging_sorting_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting);

		$rows = $result->result_array();
		$recordCount = $all_pembuangansampah->num_rows();

		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}

	public function getJSON(){


		$this->load->model('model_trayek');

		$jtStartIndex =  0;//;$this->input->get('jtStartIndex');
		$jtPageSize =  1000;//$this->input->get('jtPageSize');
		$jtSorting = "TRAYEK_WAKTUREALISASI DESC";//$this->input->get('jtSorting');

		$tanggalTransaksi = $this->input->post('tanggal');
		$nopolKendaraan = $this->input->post('nopol');
		$aplikasiKendaraan = "";
		$kategoriKendaraan = "";
		$tps = "";
		$statusTrayek = 2;


		//$all_pembuangansampah = $this->model_trayek->get_all_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek);
		$result = $this->model_trayek->get_all_trayek_pembuangansampah_by_filterJSON($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting);

		$rows = $result->result_array();
		print json_encode($rows);
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

	public function getDokumentasiTrayekByTrayekID(){
		$trayekID = $this->input->post('trayekID');
		$this->load->model('model_dokumentasitrayek');
		//$baseURL = base_url();
		$dokumentasiTrayekByTrayekID = $this->model_dokumentasitrayek->get_dokumentasitrayek_by_trayek_id($trayekID);
		$data = '';
		if($dokumentasiTrayekByTrayekID->num_rows() > 0){
			//$data .= '<center><div class="carousel" id="carousel">';
			foreach($dokumentasiTrayekByTrayekID->result() as $dokumentasiTrayek){
				$data .= '<div class="slide"><img src="'.base_url().$dokumentasiTrayek->DOKUMENTASITRAYEK_FOTO.'" class="cover1" /></div>';
			}
			$data .= '<a class="controls left"><i class="icon-arrow-left-3"></i></a><a class="controls right"><i class="icon-arrow-right-3"></i></a></div></center>';

		}
		echo $data;
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

	public function updatetrayekpembuangansampah(){
		$this->auth->restrict();
		$this->auth->cek_menu(45);
		$this->load->model('model_trayek');
		$this->load->model('model_spot');
		$this->load->model('model_rute');

		$trayek_id = $this->input->post('TRAYEK_ID');
		$kmRealisasi = $this->input->post('TRAYEK_KMREALISASI');
		$waktuRealisasi = $this->input->post('TRAYEK_WAKTUREALISASI');
		$nomorPolisi = $this->input->post('KENDARAAN_NOMORPOLISI');
		$namaTPS = $this->input->post('SPOT_ASAL_NAMA');
		$beratKotorTimbangan = $this->input->post('TRAYEK_BERATKOTORTIMBANGAN');
		$beratKosongKendaraan = $this->input->post('TRAYEK_BERATKOSONGKENDARAAN');
		$beratBersihSampah = $this->input->post('TRAYEK_BERATBERSIHSAMPAH');
		$keterangan = $this->input->post('TRAYEK_KETERANGAN');

		$tpsByNama = $this->model_spot->get_spot_by_kategorispot_and_nama(3,$namaTPS);
		if($tpsByNama->num_rows() > 0){
			$tpsRow = $tpsByNama->row();
			$tpsID = $tpsRow->SPOT_ID;
			$spotAsalID = $tpsID;
			$spotTujuanID = 4;

			$rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($spotAsalID,$spotTujuanID);

			$ruteID = 1;
			$kategoriRuteNama = "";
			$spotAsalNama = "";
			$spotTujuanNama = "";
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
			$tanggalHariIni = (new \DateTime())->format('Y-m-d');

			if ($rute->num_rows() > 0){
				$ruteRow = $rute->row();
				$ruteID = $ruteRow->RUTE_ID;
				$kategoriRuteNama = $ruteRow->KATEGORIRUTE_NAMA;
				$spotAsalNama = $ruteRow->RUTE_ASAL_NAMA;
				$spotTujuanNama = $ruteRow->RUTE_TUJUAN_NAMA;

				$data_trayek = array(
					'TRAYEK_NAMA' => $kategoriRuteNama." di ".$spotTujuanNama,
					'RUTE_ID' => $ruteID,
					'TRAYEK_KMREALISASI' => $kmRealisasi,
					'TRAYEK_WAKTUREALISASI' => $waktuRealisasi,
					'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
					'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
					'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
					'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang,
					'TRAYEK_KETERANGAN' => $keterangan,
					'STATUSTRAYEK_ID' => 2
				);
				$this->model_trayek->update_trayek_by_id($trayek_id,$data_trayek);

				$jTableResult = array();
				$jTableResult['Result'] = "OK";
				print json_encode($jTableResult);
			}
			else{
				$jTableResult = array();
				$jTableResult['Result'] = "FAIL";
				print json_encode($jTableResult);
			}

		}
		else{
			$jTableResult = array();
			$jTableResult['Result'] = "FAIL";
			print json_encode($jTableResult);
		}


	}

	public function deletetrayekpembuangansampah(){
		$this->auth->restrict();
		$this->auth->cek_menu(45);

		$this->load->model('model_trayek');
		$this->load->model('model_dokumentasitrayek');

		$trayek_id = $this->input->post('TRAYEK_ID');

		$dokumentasiTrayekByID = $this->model_dokumentasitrayek->get_dokumentasitrayek_by_trayek_id($trayek_id);
		if($dokumentasiTrayekByID-> num_rows() > 0){
			foreach($dokumentasiTrayekByID->result() as $row){
				$dokumentasiTrayekID = $row->DOKUMENTASITRAYEK_ID;
				$this->model_dokumentasitrayek->delete_dokumentasitrayek_by_id($dokumentasiTrayekID);
			}
			$this->model_trayek->delete_trayek_by_id($trayek_id);
		}
		else{
			$this->model_trayek->delete_trayek_by_id($trayek_id);
		}


		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
}

?>
