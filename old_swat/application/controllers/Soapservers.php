<?php 
class Soapservers extends CI_Controller  {

    public function __construct() {
        parent::__construct(); 
        $ns = 'http://'.$_SERVER['HTTP_HOST'].'/swat/index.php/Soapserver/?wsdl';
        $this->load->library("Nusoap_lib"); // load nusoap toolkit library in controller
        $this->nusoap_server = new soap_server(); // create soap server object
        $this->nusoap_server->configureWSDL("SOAP Server SWAT", $ns); // wsdl cinfiguration
        $this->nusoap_server->wsdl->schemaTargetNamespace = $ns; // server namespace
     

        $input_array_insertDB = array ('nopol' => "xsd:string", 
                              'tps' => "xsd:string", 
                              'waktu' => "xsd:string", 
                              'km' => "xsd:string",
							  'bkosong' => "xsd:string",
							  'bkotor' => "xsd:string",
                              'bbersih' => "xsd:string",
                              'container' => "xsd:string",
                              'jatahKitir' => "xsd:string",
							  'ket' => "xsd:string",
							  'petugasid' => "xsd:int"); // "addnumbers" method parameters
       
        $return_string_insertDB = array ("return" => "xsd:string");
        
        $input_array_insertPenimbanganTerverifikasi = array ('nopol' => "xsd:string", 
                              'tps' => "xsd:string", 
                              'waktu' => "xsd:string", 
                              'km' => "xsd:string",
							  'bkosong' => "xsd:string",
							  'bkotor' => "xsd:string",
                              'bbersih' => "xsd:string",
                              'container' => "xsd:string",
                              'jatahKitir' => "xsd:string",
							  'ket' => "xsd:string",
							  'petugasid' => "xsd:int"); // "addnumbers" method parameters
       
        $return_string_insertPenimbanganTerverifikasi = array ("return" => "xsd:string");
        
        $input_array_updatePembuanganTerverifikasi = array ('idTrayek' => "xsd:string",                               
							  'bkosong' => "xsd:string",
							  'bkotor' => "xsd:string",
                              'bbersih' => "xsd:string",
                              'waktuRealisasi' => "xsd:string");
       
        $return_string_updatePembuanganTerverifikasi = array ("return" => "xsd:string");
        
        $input_array_insertJatahKitir = array ('nomorPolisi' => "xsd:string", 
                              'namaPersil' => "xsd:string", 
                              'waktuMasaBerlakuAwal' => "xsd:string", 
                              'waktuMasaBerlakuAkhir' => "xsd:string",
                              'jumlahJatahKitir' => "xsd:string"); // "addnumbers" method parameters
       
        $return_string_insertJatahKitir = array ("return" => "xsd:string");
        
        //$return_array = array ("return" => "xsd:array");
        $this->nusoap_server->register('insertDB', $input_array_insertDB, $return_string_insertDB, "urn:SoapserverWSDL", "urn:".$ns."/insertDB", "rpc", "encoded", "");
        $this->nusoap_server->register('insertPenimbanganTerverifikasi', $input_array_insertPenimbanganTerverifikasi, $return_string_insertPenimbanganTerverifikasi, "urn:SoapserverWSDL", "urn:".$ns."/insertPenimbanganTerverifikasi", "rpc", "encoded", "");
        
        $this->nusoap_server->register('updatePembuanganTerverifikasi', $input_array_updatePembuanganTerverifikasi, $return_string_updatePembuanganTerverifikasi, "urn:SoapserverWSDL", "urn:".$ns."/updatePembuanganTerverifikasi", "rpc", "encoded", "");
        
        $this->nusoap_server->register('insertJatahKitir', $input_array_insertJatahKitir, $return_string_insertJatahKitir, "urn:SoapserverWSDL", "urn:".$ns."/insertJatahKitir", "rpc", "encoded", "");
                
        $this->nusoap_server->register('getpembuangansampahbyfilter', array()); 
    }
    
    public function index()
    {
        function insertDB($nopol,$tps,$waktu,$km,$bkosong,$bkotor,$bbersih,$container,$jatahKitir,$ket,$petugasid) {
            ob_clean();
            $kendaraanNomorPolisi = $nopol;
            $beratBersihSampah = $bbersih;
			$beratKosongKendaraan = $bkosong;
			$beratKotorTimbangan = $bkotor;
            $volumeSampah = 0;
            $lokasiTPS = $tps;
            $nominalKm = $km;
            $waktuPembuanganSampah = $waktu;
			$keterangan= $ket;
            
            date_default_timezone_set('Asia/Jakarta');
            $waktuSekarang = (new \DateTime())->format('H:i:s');
            $tanggalHariIni = (new \DateTime())->format('Y-m-d');
            //$beratKosongKendaraan = 0;
            $tpsID = 1;
            $kendaraanID = 1;                           
            
            $CI =& get_instance();
            $CI->load->model('model_kendaraan');
            $CI->load->model('model_trayek');
            $CI->load->model('model_spot');
            $CI->load->model('model_detailtransaksiangkutsampah');
            $CI->load->model('model_rute');
            $CI->load->model('model_dokumentasitrayek');
            $CI->load->model('model_jatahkitir');
            $kendaraan = $CI->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
            if($kendaraan->num_rows >0)
            {
                $rowKendaraan = $kendaraan->row();
                $kendaraanID = $rowKendaraan->KENDARAAN_ID;
                $kategoriSumberSampahID = $rowKendaraan->KATEGORISUMBERSAMPAH_ID;
                $tps = $CI->model_spot->get_spot_by_kategorispot_and_nama(3,$lokasiTPS);
                if($tps->num_rows >0)
                {
                    $rowTPS = $tps->row();
                    $tpsID = $rowTPS->SPOT_ID;
                    $trayekPembuangan = $CI->model_trayek->get_trayek_pembuangan($tanggalHariIni,$kendaraanID,$tpsID);
                    $trayekID = 0;
                    if($trayekPembuangan->num_rows >0)
                    {
                        $rowTrayek = $trayekPembuangan->row();
                        $trayekID = $rowTrayek->trayekID;   
                        $data_trayek = array(
							'PENGGUNA_ID'=>$petugasid,
                            'TRAYEK_WAKTUREALISASI' =>$waktuPembuanganSampah,
                            'TRAYEK_KMREALISASI'=> $nominalKm,
                            'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
                            'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
                            'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
                            //'TRAYEK_VOLUMESAMPAH'=> $volumeSampah,
                            'STATUSTRAYEK_ID' => 2,
							'TRAYEK_KETERANGAN' => $keterangan,
                            'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
                        );
                        $CI->model_trayek->update_trayek_by_id($trayekID,$data_trayek);

                    }   
                    else{
                        $detailTransaksiTPA = $CI->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,1);
                        if($detailTransaksiTPA->num_rows >0)
                        {
                            $rowDetailTransaksi = $detailTransaksiTPA->row();
                            $detailTransaksi_ID = $rowDetailTransaksi->DETAILTRANSAKSIANGKUTSAMPAH_ID;
                            $tpaID = 4;
                            $rute = $CI->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($tpsID,$tpaID);
                            $ruteID = 127811;
                            if($rute->num_rows > 0){
                                $rowRute = $rute->row();
                                $ruteID = $rowRute->RUTE_ID;
                            }
                            $data_trayek = array(
                                'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $detailTransaksi_ID,
                                'TRAYEK_NAMA' => 'Pembuangan Sampah Tidak Terjadwal dari TPS '.$lokasiTPS.' ke TPA',
                                'RUTE_ID' => $ruteID,
								'PENGGUNA_ID'=>$petugasid,
                                'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
                                'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
                                'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
                                //'TRAYEK_VOLUMESAMPAH'=> $volumeSampah,
                                'TRAYEK_WAKTUREALISASI' =>$waktuPembuanganSampah,
                                'TRAYEK_KMREALISASI'=> $nominalKm,
                                'STATUSTRAYEK_ID' => 2,
								'TRAYEK_KETERANGAN' => $keterangan,
                                'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
                            );
                            $CI->model_trayek->insert_trayek($data_trayek);
                            $lastInsertedTrayek = $CI->model_trayek->get_last_inserted_trayek();
                            $rowlastInsertedTrayek = $lastInsertedTrayek->row();
                            $trayekID = $rowlastInsertedTrayek->TRAYEK_ID;                            
                        }
                    }
                    
                   
					return $trayekID;
                }
            }
                    
        }

		function insertPenimbanganTerverifikasi($nopol,$tps,$waktu,$km,$bkosong,$bkotor,$bbersih,$container,$jatahKitir,$ket,$petugasid)
		{
            ob_clean();
            $kendaraanNomorPolisi = $nopol;
            $beratBersihSampah = $bbersih;
			$beratKosongKendaraan = $bkosong;
			$beratKotorTimbangan = $bkotor;
            $volumeSampah = 0;
            $lokasiTPS = $tps;
            $nominalKm = $km;
            $waktuPembuanganSampah = $waktu;
			$keterangan= $ket;
            
            date_default_timezone_set('Asia/Jakarta');
            $waktuSekarang = (new \DateTime())->format('H:i:s');
            $tanggalHariIni = (new \DateTime())->format('Y-m-d');
            //$beratKosongKendaraan = 0;
            $tpsID = 1;
            $kendaraanID = 1;                           
            
            $CI =& get_instance();
            $CI->load->model('model_kendaraan');
            $CI->load->model('model_trayek');
            $CI->load->model('model_spot');
            $CI->load->model('model_detailtransaksiangkutsampah');
            $CI->load->model('model_rute');
            $CI->load->model('model_dokumentasitrayek');
            $CI->load->model('model_jatahkitir');
            $kendaraan = $CI->model_kendaraan->get_kendaraan_by_nomorkendaraan($kendaraanNomorPolisi);
            if($kendaraan->num_rows >0)
            {
                $rowKendaraan = $kendaraan->row();
                $kendaraanID = $rowKendaraan->KENDARAAN_ID;
                $kategoriSumberSampahID = $rowKendaraan->KATEGORISUMBERSAMPAH_ID;
                $tps = $CI->model_spot->get_spot_by_kategorispot_and_nama(3,$lokasiTPS);
                if($tps->num_rows >0)
                {
                    $rowTPS = $tps->row();
                    $tpsID = $rowTPS->SPOT_ID;
                    $trayekPembuangan = $CI->model_trayek->get_trayek_pembuangan($tanggalHariIni,$kendaraanID,$tpsID);
                    $trayekID = 0;
                    if($trayekPembuangan->num_rows >0)
                    {
                        $rowTrayek = $trayekPembuangan->row();
                        $trayekID = $rowTrayek->trayekID;   
                        $data_trayek = array(
							'PENGGUNA_ID'=>$petugasid,
                            'TRAYEK_WAKTUREALISASI' =>$waktuPembuanganSampah,
                            'TRAYEK_KMREALISASI'=> $nominalKm,
                            'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
                            'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
                            'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
                            'STATUSTRAYEK_ID' => 3,
							'TRAYEK_KETERANGAN' => $keterangan,
                            'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
                        );
                        $CI->model_trayek->update_trayek_by_id($trayekID,$data_trayek);

                    }   
                    else{
                        $detailTransaksiTPA = $CI->model_detailtransaksiangkutsampah->get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,1);
                        if($detailTransaksiTPA->num_rows >0)
                        {
                            $rowDetailTransaksi = $detailTransaksiTPA->row();
                            $detailTransaksi_ID = $rowDetailTransaksi->DETAILTRANSAKSIANGKUTSAMPAH_ID;
                            $tpaID = 4;
                            $rute = $CI->model_rute->get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($tpsID,$tpaID);
                            $ruteID = 127811;
                            if($rute->num_rows > 0){
                                $rowRute = $rute->row();
                                $ruteID = $rowRute->RUTE_ID;
                            }
                            $data_trayek = array(
                                'DETAILTRANSAKSIANGKUTSAMPAH_ID' => $detailTransaksi_ID,
                                'TRAYEK_NAMA' => 'Pembuangan Sampah Tidak Terjadwal dari TPS '.$lokasiTPS.' ke TPA',
                                'RUTE_ID' => $ruteID,
								'PENGGUNA_ID'=>$petugasid,
                                'TRAYEK_BERATKOSONGKENDARAAN' => $beratKosongKendaraan,
                                'TRAYEK_BERATKOTORTIMBANGAN' => $beratKotorTimbangan,
                                'TRAYEK_BERATBERSIHSAMPAH' => $beratBersihSampah,
                                'TRAYEK_WAKTUREALISASI' =>$waktuPembuanganSampah,
                                'TRAYEK_KMREALISASI'=> $nominalKm,
                                'STATUSTRAYEK_ID' => 3,
								'TRAYEK_KETERANGAN' => $keterangan,
                                'TRAYEK_WAKTUENTRIREALISASI' => $tanggalHariIni.' '.$waktuSekarang
                            );
                            $CI->model_trayek->insert_trayek($data_trayek);
                            $lastInsertedTrayek = $CI->model_trayek->get_last_inserted_trayek();
                            $rowlastInsertedTrayek = $lastInsertedTrayek->row();
                            $trayekID = $rowlastInsertedTrayek->TRAYEK_ID;                            
                        }
                    }
                    
                   
					return $trayekID;
                }
            }
                    
        }

		function insertJatahKitir($nomorPolisi,$namaPersil,$waktuMasaBerlakuAwal,$waktuMasaBerlakuAkhir,$jumlahJatahKitir) {
            ob_clean();
            
			$tpsID = 1;
            $kendaraanID = 1; 
            $jumlahKitir = 1;
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
            $tanggalHariIni = (new \DateTime())->format('Y-m-d');
			
            $CI =& get_instance();
            $CI->load->model('model_kendaraan');        
            $CI->load->model('model_spot');        
            $CI->load->model('model_jatahkitir');        
            if($jumlahJatahKitir>0){
				$jumlahKitir = $jumlahJatahKitir;
			}
            $kendaraan = $CI->model_kendaraan->get_kendaraan_by_nomorkendaraan($nomorPolisi);
            
			if($kendaraan->num_rows >0)
            { 
                $rowKendaraan = $kendaraan->row();
                $kendaraanID = $rowKendaraan->KENDARAAN_ID;
                $kategoriSumberSampahID = $rowKendaraan->KATEGORISUMBERSAMPAH_ID;
                $tps = $CI->model_spot->get_spot_pembuangan_by_kategorispot_and_nama(3,$namaPersil);
                if($tps->num_rows >0)
                {
                    $rowTPS = $tps->row();
                    $tpsID = $rowTPS->SPOT_ID;
                    $data_jatahkitir = array(
						'KENDARAAN_ID' => $kendaraanID,
						'SPOT_ID' => $tpsID,
						'STATUSJATAHKITIR_ID' => 1,
						'JATAHKITIR_WAKTUDITERBITKAN' => $tanggalHariIni.' '.$waktuSekarang,
						'JATAHKITIR_MASABERLAKUAWAL' => $waktuMasaBerlakuAwal,
						'JATAHKITIR_MASABERLAKUAKHIR' => $waktuMasaBerlakuAkhir
						
					);
					//$idJatahKitir = "";
					//$array_idJatahKitir = array();
					$result = "";
					for($i = 1; $i <= $jumlahKitir; $i++){
						$CI->model_jatahkitir->insert_jatahkitir($data_jatahkitir);
						$lastInsertedJatahKitir = $CI->model_jatahkitir->get_last_inserted_jatahkitir();
						$rowLastInsertedJatahKitir = $lastInsertedJatahKitir->row();
						/* if($rowLastInsertedJatahKitir->num_rows >0){
						
						} */
						$idLastInsertedJatahKitir = $rowLastInsertedJatahKitir->JATAHKITIR_ID;
						$result = $result.$idLastInsertedJatahKitir.',';
					}
                    
                }
			}
            
        	return $result;             
        }

        function getpembuangansampahbyfilter(){
            $CI =& get_instance();

            $CI->load->model('model_trayek');
            
            /*$jtStartIndex =  $this->input->get('jtStartIndex');
            $jtPageSize =  $this->input->get('jtPageSize');
            $jtSorting = $this->input->get('jtSorting');*/
            
            $tanggalTransaksi = "2014-08-14";//$this->input->post('tanggalTransaksi');
            $nopolKendaraan = "";//$this->input->post('nopolKendaraan');
            $aplikasiKendaraan = "ALL APLIKASI";//$this->input->post('aplikasiKendaraan');
            $kategoriKendaraan = "";//$this->input->post('kategoriKendaraan');
            $tps = "ALL TPS";//$this->input->post('tpsList');
            $statusTrayek = 2;
            
            
            $all_pembuangansampah = $CI->model_trayek->get_all_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek);
            //$result = $this->model_trayek->get_all_paging_sorting_trayek_pembuangansampah_by_filter($tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$tps,$statusTrayek,$jtStartIndex,$jtPageSize,$jtSorting);
            
        
        
        $jTableResult = array();       
        $jTableResult['Records'] = $all_pembuangansampah;
        return json_encode($jTableResult);            
            
            
        }
        
        function updatePembuanganTerverifikasi($idTrayek, $bkotor, $bkosong, $bbersih, $waktuRealisasi){
			ob_clean();
			
			date_default_timezone_set('Asia/Jakarta');
			$waktuSekarang = (new \DateTime())->format('H:i:s');
            $tanggalHariIni = (new \DateTime())->format('Y-m-d');
			
            $CI =& get_instance();
            $CI->load->model('model_trayek');    
            
            $data_trayek = array(
				'TRAYEK_BERATKOTORTIMBANGAN' => $bkotor,
				'TRAYEK_BERATKOSONGKENDARAAN' => $bkosong,
				'TRAYEK_BERATBERSIHSAMPAH' => $bbersih,
				'TRAYEK_WAKTUREALISASI' => $waktuRealisasi,
				'STATUSTRAYEK_ID' => 2
			);
			$CI->model_trayek->update_trayek_by_id($idTrayek,$data_trayek);
			return $idTrayek;
		}
        
        $this->nusoap_server->service(file_get_contents("php://input")); // read raw data from request body
    }   
}
?>