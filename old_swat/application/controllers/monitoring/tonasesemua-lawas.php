<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Tonasesemua extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

    public function index(){
        $this->auth->restrict();
        $this->auth->cek_menu(50);
        $this->template->set('title','Monitoring Tonase | SI Angkutan DKP');
        $this->template->load('template_monitoring','monitoring/tonase/index');
    }

	public function perdaerah(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		/*$this->load->model('model_kendaraan');
		$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah();*/

		$this->template->set('title','Jumlah Tonase TPS | SI Angkutan DKP');
		$this->template->load('template','monitoring/tonase/perdaerah');
	}
	public function pertanggal(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		/*$this->load->model('model_kendaraan');
		$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah();*/

		$this->template->set('title','Jumlah Tonase TPS | SI Angkutan DKP');
		$this->template->load('template','monitoring/tonase/pertanggal');
	}

    public function getTotalTonaseLimaHari(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_lima_hari($tanggal);
        $hasil = $result->result();
        $dataakhir = array();
        for($i = sizeof($hasil)-1; $i>=0;$i--)
        {
            $dataakhir[]=$hasil[$i];
        }
        echo json_encode($dataakhir);
    }
	public function getTotalTonaseSatuBulan(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_satu_bulan($tanggal);
        $hasil = $result->result();
        $dataakhir = array();
        for($i = sizeof($hasil)-1; $i>=0;$i--)
        {
            $dataakhir[]=$hasil[$i];
        }
        echo json_encode($dataakhir);
    }
    public function getNamaTonaseLimaHariTPS(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS($tanggal);
        echo json_encode($result->result());
    }
    public function getTonaseLimaHariTPS(){
		$tanggal = $this->input->post('tanggal');
		$date = date_create($tanggal);
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS($tanggal);
        $hasil = array();
        $data = array();
        $dataakhir = array();
        $n = 0;
        if($result->num_rows() > 0){
            foreach($result->result() as $total){
                $temp = $this->model_monitoringtonasesampahsemua->get_detail_tonase_sampah_lima_hari_TPS($total->NAMA,$tanggal);
                $hasil[] = $temp->result();
            }
            for($i = 4; $i>=0;$i--)
            {
                for($j = 0; $j<5; $j++){
                    if(sizeof($hasil[$j])>$i)$data["TANGGAL"] = date('Y-m-d', strtotime('-'.$i.' day', strtotime($tanggal)));//$hasil[$j][$i]->TANGGAL;
                }
                //$data["TANGGAL"] = $hasil[0][$i]->TANGGAL;
                $data[$hasil[0][0]->NAMA] = (sizeof($hasil[0])>$i)?$hasil[0][$i]->TONASE:0;
                $data[$hasil[1][0]->NAMA] = (sizeof($hasil[1])>$i)?$hasil[1][$i]->TONASE:0;
                $data[$hasil[2][0]->NAMA] = (sizeof($hasil[2])>$i)?$hasil[2][$i]->TONASE:0;
                $data[$hasil[3][0]->NAMA] = (sizeof($hasil[3])>$i)?$hasil[3][$i]->TONASE:0;
                $data[$hasil[4][0]->NAMA] = (sizeof($hasil[4])>$i)?$hasil[4][$i]->TONASE:0;
                $dataakhir[]=$data;
            }
        }
        echo json_encode($dataakhir);
    }
    /*public function getTonaseLimaHariTPS(){
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS();
        $hasil = array();
        $i = 1;
        if($result->num_rows() > 0){
            foreach($result->result() as $total){
                $temp = $this->model_monitoringtonasesampahsemua->get_detail_tonase_sampah_lima_hari_TPS($total->NAMA);
                $hasil[] = $temp->result();
            }
        }
        echo json_encode($hasil);
    }*/
    public function getSelisihTonase(){
		$tanggal = $this->input->post('tanggal');
		/*$bulan = $this->input->post('bulan');
		$tahun = $this->input->post('tahun');*/
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_selisih_tonase($tanggal);
        $data = $result->result();
        $berat1 = intval($data[0]->BERAT);
        $berat2 = 1200000;
        $hasil = array();
        if($berat1>$berat2){
            $hasil["BERAT"]=$berat1;
            $hasil["SELISIH"]=$berat1-$berat2;
            $hasil["POSISI"]="NAIK";
            $hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
        }
        else{
            $hasil["BERAT"]=$berat1;
            $hasil["SELISIH"]=$berat1-$berat2;
            $hasil["POSISI"]="TURUN";
            $hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
        }
        echo json_encode($hasil);
    }
    public function getTonaseJenisSampah(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_tonase_jenis_sampah($tanggal);
        echo json_encode($result->result());
    }
}

?>
