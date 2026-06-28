<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Importexcel extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(120);

        date_default_timezone_set('Asia/Jakarta');
                
        $waktuSekarang = (new \DateTime())->format('H:i:s');
		$tanggalHariIni = (new \DateTime())->format('Y-m-d');
		$data['tanggalHariIni'] = $tanggalHariIni;

        $tanggalDari = (new \DateTime())->format('d-m-Y');

        $data['tanggalDari'] = $tanggalDari;

        $this->template->set('title','Import Excel | SWAT DKP Surabaya');
		$this->template->load('template','transaksi/importexcel',$data);
	}

    public function getlist_range_date()
    {
        $this->load->model('model_transaksiangkutsampah');
        $rangedate = $this->model_transaksiangkutsampah->get_imported_excel_range_date();
        $sresult = "";
        foreach($rangedate->result() as $row)
        {
            $sresult = $row->tgltitle . "#" . $sresult;
        }
        $sresult = explode("#",$sresult);
        $tglakhir = $sresult[0];
        $tglawal = $sresult[1];
        echo $tglakhir . "#" . $tglawal;
    }

    public function getlist()
    {
        $this->auth->restrict();
        $this->load->model('model_transaksiangkutsampah');

        $jtStartIndex = $this->input->get('jtStartIndex');
        $jtPageSize = $this->input->get('jtPageSize');
        $jtSorting = $this->input->get('jtSorting');

        $daritanggalTransaksi = $this->input->post('daritanggalTransaksi');
        $all_imported_excel = $this->model_transaksiangkutsampah->get_all_imported_excel($daritanggalTransaksi);
        $recordCount = $all_imported_excel->num_rows();

        $result = $this->model_transaksiangkutsampah->get_all_paging_sorting_all_imported_excel($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi);
        $rows = $result->result_array();

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

    public function cek_nama_tps_eksis($namatps) {
        $this->load->model('model_transaksiangkutsampah');
        $this->load->model('model_spot');
        $outs = "not_exist";
        $cektps =  $this->model_spot->get_spot_pembuangan_by_nama(trim($namatps));
        if($cektps->num_rows>0) {
            foreach($cektps->result() as $row)
            {
                if (trim($row->SPOT_NAMA)==trim($namatps)) {
                    $outs = trim($row->SPOT_NAMA);
                    break;
                }
            }
        } else {
            $cektps =   $this->model_transaksiangkutsampah->komparasi_konversi($namatps);
            if($cektps->num_rows>0) {
                foreach($cektps->result() as $row)
                {
                    if (trim($row->si)==trim($namatps)) {
                        $outs = trim($row->swat);
                        break;
                    }
                }
            } ;
        }
        return $outs;
    }

    public function update_pembuangan_tpa_excel_per_row($kendaraanNomorPolisi, $beratKotorTimbangan, $beratKosongKendaraan, $beratBersihSampah, $lokasiTPS, $nominalKm, $waktuPembuanganSampah, $waktuSekarang, $tanggalHariIni) {

        $volumeSampah = 0;
        $keterangan = "";
        $idPengguna = "Excel SI";

        //$tpsID = 1;
        //$kendaraanID = 1;

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
                echo $tanggalHariIni . " " . $lokasiTPS . " " . $kendaraanNomorPolisi . " replace finish...<br>";
            } else {
                echo $tanggalHariIni . " " . $lokasiTPS . " " . $kendaraanNomorPolisi . " failed spot pembuangan tidak ditemukan...<br>";
            }

        } else {
            echo $tanggalHariIni . " " . $lokasiTPS . " " . $kendaraanNomorPolisi . " failed nopol tidak ditemukan...<br>";
        }

    }

	public function update_pembuangan_tpa_excel() {

        $daritanggalTransaksi = $this->input->post('daritanggalTransaksi');
        $daritanggalTransaksi_p = explode("-",$daritanggalTransaksi);
        $daritanggalTransaksi_p = $daritanggalTransaksi_p[2] . "-" . $daritanggalTransaksi_p[1] . "-" . $daritanggalTransaksi_p[0];
        // delete all data pembuangan on input date
        $this->load->model('model_trayek');
        $this->load->model('model_dokumentasitrayek');
        $tanggalTransaksi = $daritanggalTransaksi_p;
        $all_pembuangansampah = $this->model_trayek->get_all_trayek_pembuangansampah_by_filter($tanggalTransaksi, false, false, false, false, false);
        $settrayekid = array();
        foreach ($all_pembuangansampah->result() as $pembuangansampah) {
            array_push($settrayekid, $pembuangansampah->TRAYEK_ID);
        }
        foreach ($settrayekid as $trayekid2del) {
            $dokumentasiTrayekByID = $this->model_dokumentasitrayek->get_dokumentasitrayek_by_trayek_id($trayekid2del);
            if($dokumentasiTrayekByID-> num_rows() > 0){
                foreach($dokumentasiTrayekByID->result() as $row){
                    $dokumentasiTrayekID = $row->DOKUMENTASITRAYEK_ID;
                    $this->model_dokumentasitrayek->delete_dokumentasitrayek_by_id($dokumentasiTrayekID);
                }
                $this->model_trayek->delete_trayek_by_id($trayekid2del);
            }
            else{
                $this->model_trayek->delete_trayek_by_id($trayekid2del);
            }
        }
        // to entry imported excel
        $this->load->model('model_transaksiangkutsampah');
        $all_imported_excel = $this->model_transaksiangkutsampah->get_all_imported_excel($daritanggalTransaksi);
        $setnopol = array();
        $setlpsdepo = array();
        $settrukasal = array();
        $setbkotor = array();
        $setbkosong = array();
        $setbbersih = array();
        foreach ($all_imported_excel->result() as $imported_excel) {
            array_push($setnopol, $imported_excel->nopol);
            array_push($setlpsdepo, $imported_excel->lpsdepo);
            array_push($settrukasal, $imported_excel->trukasal);
            array_push($setbkotor, $imported_excel->bkotor);
            array_push($setbkosong, $imported_excel->bkosong);
            array_push($setbbersih, $imported_excel->bbersih);
        }
        $idx=0;
        foreach ($setnopol as $nopoltoset) {
            //$nomorPolisi = preg_replace('/\s+/', '', $this->input->post('nopol'));
            $kendaraanNomorPolisi = preg_replace('/\s+/', '', $nopoltoset);
            $beratKotorTimbangan = $setbkotor[$idx];
            $beratKosongKendaraan = $setbkosong[$idx];
            $beratBersihSampah = $setbbersih[$idx];
            $volumeSampah = 0;
            $lokasiTPS = $setlpsdepo[$idx];
            $nominalKm = 0;
            $waktuPembuanganSampah = '07:00:00';
            $keterangan = '';
            $idPengguna = '1'; // 51 30
            date_default_timezone_set('Asia/Jakarta');
            $waktuSekarang = '07:00:00';
            $tanggalHariIni = $daritanggalTransaksi_p;
            $tpsID = 1;
            $kendaraanID = 1;
            $this->load->model('model_kendaraan');
            $this->load->model('model_spot');
            $this->load->model('model_detailtransaksiangkutsampah');
            $this->load->model('model_rute');
            $kendaraan = $this->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
            if($kendaraan->num_rows >0)
            {
                echo "-- data kendaraan --<br>";
                echo "data kendaraan lokasiTPS : ".$lokasiTPS."<br>";
                $rowKendaraan = $kendaraan->row();
                $kendaraanID = $rowKendaraan->KENDARAAN_ID;
                $kategoriSumberSampahID = $rowKendaraan->KATEGORISUMBERSAMPAH_ID;
                $tps = $this->model_spot->get_spot_pembuangan_by_kategorispot_and_nama(3,$lokasiTPS);
                echo "data tps spot_pembuangan numrows : " . $tps->num_rows . "<br>";
                if ($tps->num_rows==0) {
                    echo "data tps spot_pembuangan tidak ditemukan : ".$lokasiTPS. "<br>";
                    echo "data tps spot_pembuangan entri baru : ".$lokasiTPS. "<br>";
                    $data_spot = array(
                        'KATEGORISPOT_ID' => '3',
                        'SPOT_NAMA' => $lokasiTPS,
                        'SPOT_ALAMAT' => $lokasiTPS,
                        'SPOT_LATITUDE' =>'-7.278607',
                        'SPOT_LONGITUDE' => '112.762779',
                        'SPOT_FOTO' => ''
                    );
                    $this->model_spot->insert_spot($data_spot);
                    $tps = $this->model_spot->get_spot_pembuangan_by_kategorispot_and_nama(3,$lokasiTPS);
                }
                if($tps->num_rows >0)
                {
                    echo "data tps spot_pembuangan ditemukan : ".$lokasiTPS. "<br>";
                    $rowTPS = $tps->row();
                    $tpsID = $rowTPS->SPOT_ID;
                    $trayekPembuangan = $this->model_trayek->get_trayek_pembuangan($tanggalHariIni,$kendaraanID,$tpsID);
                    $trayekID = 0;
                    echo "-- data tps --<br>";
                    echo "data tps tanggalHariIni : " . $tanggalHariIni."<br>";
                    echo "data tps kendaraanID : ". $kendaraanID ."<br>";
                    echo "data tps tpsID : " .$tpsID. "<br>";
                    echo "data tps trayekPembuangan numrows : " . $trayekPembuangan->num_rows . "<br>";
                    if($trayekPembuangan->num_rows >0)
                    {
                        echo "-- data trayek pembuangan --<br>";
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
                        echo "--> data updated by trayek id <--<br>";
                    }
                    else{
                        $detailTransaksiTPA = $this->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,1);
                        echo "-- data detail transaksi tpa --<br>";
                        echo "data detail transaksi tpa tanggalHariIni : ".$tanggalHariIni."<br>";
                        echo "data detail transaksi tpa kendaraan ID : " . $kendaraanID . "<br>";
                        echo "data detail transaksi tpa numrows : " . $detailTransaksiTPA->num_rows . "<br>";
                        if($detailTransaksiTPA->num_rows >0)
                        {
                            echo "-- data detail transaksi tpa id --<br>";
                            $rowDetailTransaksi = $detailTransaksiTPA->row();
                            $detailTransaksi_ID = $rowDetailTransaksi->DETAILTRANSAKSIANGKUTSAMPAH_ID;
                            $tpaID = 4;
                            $rute = $this->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($tpsID,$tpaID);
                            $ruteID = 127811;
                            if($rute->num_rows > 0){
                                $rowRute = $rute->row();
                                $ruteID = $rowRute->RUTE_ID;
                            }
                            echo "-- data trayek --<br>";
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
                            echo "data trayek, TRAYEK_ID : " . $trayekID . "<br>";
                            echo "--> data inserted by trayek id <--<br>";
                        }
                    }
                }
            }
            $idxx = $idx + 1;
            echo "No. ".$idxx . " proses insert " . $nopoltoset . "<br>";
            echo "-------------<br><br>";
            $idx++;
        }

        /*
        DELETE FROM trayek WHERE YEAR(trayek.TRAYEK_WAKTUREALISASI) = 2018
        AND MONTH(trayek.TRAYEK_WAKTUREALISASI) = 01
        AND DAY(trayek.TRAYEK_WAKTUREALISASI) = 15;

        A Database Error Occurred

        Error Number: 1451

        Cannot delete or update a parent row: a foreign key constraint fails (`try123_dbswat`.`dokumentasitrayek`, CONSTRAINT `FK_RELATIONSHIP_48` FOREIGN KEY (`TRAYEK_ID`) REFERENCES `trayek` (`TRAYEK_ID`))

        delete from trayek WHERE YEAR(trayek.TRAYEK_WAKTUREALISASI) = 2018 AND MONTH(trayek.TRAYEK_WAKTUREALISASI) = 01 AND DAY(trayek.TRAYEK_WAKTUREALISASI) = 15;

        Filename: /home/try123/public_html/swat/models/model_trayek.php

        Line Number: 737
        */
        /*
        $daritanggalTransaksi = $this->input->post('daritanggalTransaksi');
        $this->load->model('model_transaksiangkutsampah');
        $all_imported_excel = $this->model_transaksiangkutsampah->get_all_imported_excel($daritanggalTransaksi);
        $this->load->model('model_trayek');
        $all_trayek_data_to_edit = $this->model_trayek->get_all_trayek_id_to_edit($daritanggalTransaksi);
        $this->model_trayek->delete_trayek_before_replace_si($daritanggalTransaksi);
        $all_imported_excel_result = $all_imported_excel->result();
        $sizeall_imported_excel_result = count($all_imported_excel_result);
        $indeximported = 0;
        foreach ($all_trayek_data_to_edit->result() as $rowedit) {
            $bkotor=$all_imported_excel_result[$indeximported]->bkotor;
            $bkosong=$all_imported_excel_result[$indeximported]->bkosong;
            $bbersih=$all_imported_excel_result[$indeximported]->bbersih;
            $this->model_trayek->edit_trayek_from_imported_excel($rowedit->TRAYEK_ID,$bkotor,$bkosong,$bbersih);
            $indeximported++;
            if ($indeximported == $sizeall_imported_excel_result) {
                break;
            }
        }
        */
        /*
        foreach($all_imported_excel->result() as $row) {
            $tpskonversi = $this->cek_nama_tps_eksis(trim($row->lpsdepo));
            if ($tpskonversi!='not_exist') {
                $this->update_pembuangan_tpa_excel_per_row($row->nopol, $row->bkotor, $row->bkosong, $row->bbersih, $tpskonversi, 0, $daritanggalTransaksi . " 12:00:00", $daritanggalTransaksi . " 12:00:00", $daritanggalTransaksi);
            }
        }
        */
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