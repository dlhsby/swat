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
	
	public function getTotalTonaseLimaHariread(){
		$tanggal = $this->input->post('tanggal');
		$dataakhir = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseLimaHari'.$tanggal.'.json')) {			
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_lima_hari($tanggal);
			$hasil = $result->result();        
			for($i = sizeof($hasil)-1; $i>=0;$i--)
			{
				$dataakhir[]=$hasil[$i];
			}
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseLimaHari'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($dataakhir));
			fclose($fp);
			echo json_encode($dataakhir);
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$this->load->model('model_monitoringtonasesampahsemua');
				$result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_lima_hari($tanggal);
				$hasil = $result->result();        
				for($i = sizeof($hasil)-1; $i>=0;$i--)
				{
					$dataakhir[]=$hasil[$i];
				}
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseLimaHari'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($dataakhir));
				fclose($fp);
			}			
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseLimaHari'.$tanggal.'.json');
			echo $dataakhir;
		}		
	}

    public function getTotalTonaseLimaHari(){
		$tanggal = $this->input->post('tanggal');
		$dataakhir = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseLimaHari'.$tanggal.'.json')) {			
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_lima_hari($tanggal);
			$hasil = $result->result();        
			for($i = sizeof($hasil)-1; $i>=0;$i--)
			{
				$dataakhir[]=$hasil[$i];
			}
			echo json_encode($dataakhir);
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseLimaHari'.$tanggal.'.json');
			echo $dataakhir;
		}		
    }
	public function getTotalTonaseSatuBulanread(){
		$tanggal = $this->input->post('tanggal');
		$dataakhir = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseSatuBulan'.$tanggal.'.json')) {
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_satu_bulan($tanggal);
			$hasil = $result->result();        
			for($i = sizeof($hasil)-1; $i>=0;$i--)
			{
				$dataakhir[]=$hasil[$i];
			}
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseSatuBulan'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($dataakhir));
			fclose($fp);
		    echo json_encode($dataakhir);
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$this->load->model('model_monitoringtonasesampahsemua');
				$result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_satu_bulan($tanggal);
				$hasil = $result->result();        
				for($i = sizeof($hasil)-1; $i>=0;$i--)
				{
					$dataakhir[]=$hasil[$i];
				}
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseSatuBulan'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($dataakhir));
				fclose($fp);
			}
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseSatuBulan'.$tanggal.'.json');
			echo $dataakhir;
		}
	}
	public function getTotalTonaseSatuBulan(){
		$tanggal = $this->input->post('tanggal');
		$dataakhir = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseSatuBulan'.$tanggal.'.json')) {
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_all_tonase_sampah_satu_bulan($tanggal);
			$hasil = $result->result();        
			for($i = sizeof($hasil)-1; $i>=0;$i--)
			{
				$dataakhir[]=$hasil[$i];
			}
		    echo json_encode($dataakhir);
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalTonaseSatuBulan'.$tanggal.'.json');
			echo $dataakhir;
		}
    }
    public function getNamaTonaseLimaHariTPS(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoringtonasesampahsemua');
        $result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS($tanggal);
        echo json_encode($result->result());
    }
	public function getTonaseLimaHariTPSread(){
		$tanggal = $this->input->post('tanggal');	
		$dataakhir = array();		
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseLimaHariTPS'.$tanggal.'.json')) {  
			$date = date_create($tanggal);
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS($tanggal);
			$hasil = array();
			$data = array();
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
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseLimaHariTPS'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($dataakhir));
			fclose($fp);
			echo json_encode($dataakhir);	
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$date = date_create($tanggal);
				$this->load->model('model_monitoringtonasesampahsemua');
				$result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS($tanggal);
				$hasil = array();
				$data = array();
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
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseLimaHariTPS'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($dataakhir));
				fclose($fp);				
			}			
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseLimaHariTPS'.$tanggal.'.json');
			echo $dataakhir;
		}        	
	}
    public function getTonaseLimaHariTPS(){
		$tanggal = $this->input->post('tanggal');
		$dataakhir = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseLimaHariTPS'.$tanggal.'.json')) {  
			$date = date_create($tanggal);
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_tonase_sampah_lima_hari_TPS($tanggal);
			$hasil = array();
			$data = array();			
			$n = 0;
			if($result->num_rows() > 0){
				foreach($result->result() as $total){
					$temp = $this->model_monitoringtonasesampahsemua->get_detail_tonase_sampah_lima_hari_TPS($total->NAMA,$tanggal);
					$hasil[] = $temp->result();
				}
				for($i = 4; $i>=0;$i--)
				{
					for($j = 0; $j<5; $j++){
						if(sizeof($hasil[$j])>$i)$data["TANGGAL"] = date('Y-m-d', strtotime('-'.$i.' day', strtotime($tanggal)));	//$hasil[$j][$i]->TANGGAL;
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
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseLimaHariTPS'.$tanggal.'.json');
			echo $dataakhir;
		}        		
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
	public function getSelisihTonaseread(){
		$tanggal = $this->input->post('tanggal');
		$hasil = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getSelisihTonase'.$tanggal.'.json')) {
			/*$bulan = $this->input->post('bulan');
			$tahun = $this->input->post('tahun');*/
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_selisih_tonase($tanggal);
			$data = $result->result();
			$berat1 = intval($data[0]->BERAT);
			$berat2 = 1200000;        
			if($berat1>$berat2){
				$hasil["BERAT"]=$berat1;
				$hasil["SELISIH"]=$berat1-$berat2;
				$hasil["POSISI"]="NAIK";
				$hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
			}else{
				$hasil["BERAT"]=$berat1;
				$hasil["SELISIH"]=$berat1-$berat2;
				$hasil["POSISI"]="TURUN";
				$hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
			}
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getSelisihTonase'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($hasil));
			fclose($fp);			
			echo json_encode($hasil);
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				/*$bulan = $this->input->post('bulan');
				$tahun = $this->input->post('tahun');*/
				$this->load->model('model_monitoringtonasesampahsemua');
				$result = $this->model_monitoringtonasesampahsemua->get_selisih_tonase($tanggal);
				$data = $result->result();
				$berat1 = intval($data[0]->BERAT);
				$berat2 = 1200000;        
				if($berat1>$berat2){
					$hasil["BERAT"]=$berat1;
					$hasil["SELISIH"]=$berat1-$berat2;
					$hasil["POSISI"]="NAIK";
					$hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
				}else{
					$hasil["BERAT"]=$berat1;
					$hasil["SELISIH"]=$berat1-$berat2;
					$hasil["POSISI"]="TURUN";
					$hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
				}
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getSelisihTonase'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($hasil));
				fclose($fp);	
			}
			$hasil = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getSelisihTonase'.$tanggal.'.json');
			echo $hasil;
		}
	}
    public function getSelisihTonase(){
		$tanggal = $this->input->post('tanggal');
		$hasil = array();
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getSelisihTonase'.$tanggal.'.json')) {
			/*$bulan = $this->input->post('bulan');
			$tahun = $this->input->post('tahun');*/
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_selisih_tonase($tanggal);
			$data = $result->result();
			$berat1 = intval($data[0]->BERAT);
			$berat2 = 1200000;        
			if($berat1>$berat2){
				$hasil["BERAT"]=$berat1;
				$hasil["SELISIH"]=$berat1-$berat2;
				$hasil["POSISI"]="NAIK";
				$hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
			}else{
				$hasil["BERAT"]=$berat1;
				$hasil["SELISIH"]=$berat1-$berat2;
				$hasil["POSISI"]="TURUN";
				$hasil["PERSEN"]=intval(($hasil["SELISIH"]/$berat2)*100);
			}
			echo json_encode($hasil);
		} else {
			$hasil = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getSelisihTonase'.$tanggal.'.json');
			echo $hasil;
		}
    }
	public function getTonaseJenisSampahread(){
		$tanggal = $this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseJenisSampah'.$tanggal.'.json')) {
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_tonase_jenis_sampah($tanggal);
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseJenisSampah'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($result->result()));
			fclose($fp);
			echo json_encode($result->result());
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$this->load->model('model_monitoringtonasesampahsemua');
				$result = $this->model_monitoringtonasesampahsemua->get_tonase_jenis_sampah($tanggal);
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseJenisSampah'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($result->result()));
				fclose($fp);
			}
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseJenisSampah'.$tanggal.'.json');
			echo $dataakhir;
		}
	}
    public function getTonaseJenisSampah(){
		$tanggal = $this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseJenisSampah'.$tanggal.'.json')) {
			$this->load->model('model_monitoringtonasesampahsemua');
			$result = $this->model_monitoringtonasesampahsemua->get_tonase_jenis_sampah($tanggal);
			echo json_encode($result->result());
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTonaseJenisSampah'.$tanggal.'.json');
			echo $dataakhir;
		}
    }
}

?>