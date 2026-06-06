<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class BahanBakar extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(78);
	
		$this->load->model('model_aplikasikendaraan');
		$this->load->model('model_kategorikendaraan');
		$this->load->model('model_bahanbakar');
		
		$data['all_aplikasikendaraan'] = $this->model_aplikasikendaraan->get_all_aplikasikendaraan();
		$data['all_kategorikendaraan'] = $this->model_kategorikendaraan->get_all_kategorikendaraan();
		$data['all_bahanbakar'] = $this->model_bahanbakar->get_all_bahanbakar();

		$this->template->set('title','Monitoring Bahan Bakar | SWAT DKP Surabaya');
		$this->template->load('template_monitoring','monitoring/bahanbakar/index',$data);
	}
	
	public function getpenggunaanbahanbakar(){
		$this->auth->restrict();
		$this->auth->cek_menu(78);

		$this->load->model('model_monitoringBahanBakar');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_penggunaanbahanbakar = $this->model_monitoringBahanBakar->get_all_penggunaanbahanbakar();
		$result = $this->model_monitoringBahanBakar->get_all_paging_sorting_penggunaanbahanbakar($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penggunaanbahanbakar->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getpenggunaanbahanbakarbyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(78);

		$this->load->model('model_monitoringBahanBakar');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$jenisWaktu = $this->input->post('jenisWaktu');
		$bulanTransaksi = $this->input->post('bulanTransaksi');
		$mingguTransaksi = $this->input->post('mingguTransaksi');
		$tanggalTransaksi = $this->input->post('tanggalTransaksi');
		$nopolKendaraan = $this->input->post('nopolKendaraan');
		$aplikasiKendaraan = $this->input->post('aplikasiKendaraan');
		$kategoriKendaraan = $this->input->post('kategoriKendaraan');
		$bahanBakar = $this->input->post('bahanBakar');
		
		
		$all_penggunaanbahanbakar = $this->model_monitoringBahanBakar->get_all_penggunaanbahanbakar_by_filter($jenisWaktu,$bulanTransaksi,$mingguTransaksi,$tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar);
		$result = $this->model_monitoringBahanBakar->get_all_paging_sorting_penggunaanbahanbakar_by_filter($jenisWaktu,$bulanTransaksi,$mingguTransaksi,$tanggalTransaksi,$nopolKendaraan,$aplikasiKendaraan,$kategoriKendaraan,$bahanBakar,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_penggunaanbahanbakar->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getKategoriKendaraanByAplikasi(){
		$aplikasiKendaraanNama = $this->input->post('aplikasiKendaraanNama');
		$this->load->model('model_kategorikendaraan');
		
		$all_kategorikendaraan = $this->model_kategorikendaraan->get_kategorikendaraan_by_aplikasi_nama($aplikasiKendaraanNama);
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
	
	public function penggunaan(){
		$this->auth->restrict();
		$this->auth->cek_menu(78);
	
		/*$this->load->model('model_kendaraan');
		$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah();*/

		$this->template->set('title','Jumlah Penggunaan Bahan Bakar | SWAT DKP Surabaya');
		$this->template->load('template','monitoring/bahanbakar/penggunaan');
	}

    public function getTotalBahanBakarBulan(){
        $tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringBahanBakar');
        $result_bulan = $this->model_monitoringBahanBakar->get_all_bahan_bakar_bulan($tanggal);
        $result_minggu = $this->model_monitoringBahanBakar->get_all_bahan_bakar_minggu($tanggal);
        $result_hari = $this->model_monitoringBahanBakar->get_all_bahan_bakar_hari($tanggal);
        $total_bulan = 0;
        $total_minggu = 0;
        $total_hari = 0;
        $data = array();
        if($result_bulan->num_rows() > 0){
            foreach($result_bulan->result() as $total){
                $total_bulan = ($total->TOTAL!=null)?intval($total->TOTAL):0;
            }
        }
        if($result_minggu->num_rows() > 0){
            foreach($result_minggu->result() as $total){
                $total_minggu = ($total->TOTAL!=null)?intval($total->TOTAL):0;
            }
        }
        if($result_hari->num_rows() > 0){
            foreach($result_hari->result() as $total){
                $total_hari = ($total->TOTAL!=null)?intval($total->TOTAL):0;
            }
        }
        $data["TOTAL_BULAN"] = $total_bulan;
        $data["TOTAL_MINGGU"] = $total_minggu;
        $data["TOTAL_HARI"] = $total_hari;
        echo json_encode($data);
    }
	
	public function getTotalBahanBakarSatuBulan(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringbahanbakar');
        $result = $this->model_monitoringbahanbakar->get_all_bahan_bakar_satu_bulan($tanggal);
        $hasil = $result->result();
        $dataakhir = array();
        for($i = sizeof($hasil)-1; $i>=0;$i--)
        {
            $dataakhir[]=$hasil[$i];
        }
        echo json_encode($dataakhir);
    }
}

?>