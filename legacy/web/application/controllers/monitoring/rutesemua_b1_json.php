<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Rutesemua extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		$this->template->set('title','Monitoring Rute | SI Angkutan DKP');
		$this->template->load('template_monitoring','monitoring/rute/index');
	}

	public function map(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		/*$this->load->model('model_kendaraan');
		$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah();*/

		$this->template->set('title','Monitoring Rute | SI Angkutan DKP');
		$this->template->load('template','monitoring/rute/map');
	}

    public function getAllRute()
    {
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute_semua');
        $result = $this->model_monitoringrute_semua->get_all_rute($tanggal);

        echo json_encode($result->result());
    }
    public function getSepuluhRuteTerakhir(){
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute_semua');
        $result = $this->model_monitoringrute_semua->get_sepuluh_rute_terakhir($tanggal);

        echo json_encode($result->result());
    }
    public function getLimaRuteTerakhir(){
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute_semua');
        $result = $this->model_monitoringrute_semua->get_lima_rute_terakhir($tanggal);

        echo json_encode($result->result());
    }
	public function getRuteAntarSpotread(){
		$tanggal=$this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getRuteAntarSpot'.$tanggal.'.json')) {
			$nopol = $this->input->post('NOPOL');
			$this->load->model('model_monitoringrute_semua');
			$result = $this->model_monitoringrute_semua->get_rute_antar_spot($nopol,$tanggal);
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getRuteAntarSpot'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($result->result()));
			fclose($fp);
			echo json_encode($result->result());
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$nopol = $this->input->post('NOPOL');
				$this->load->model('model_monitoringrute_semua');
				$result = $this->model_monitoringrute_semua->get_rute_antar_spot($nopol,$tanggal);
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getRuteAntarSpot'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($result->result()));
				fclose($fp);
			}
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getRuteAntarSpot'.$tanggal.'.json');
			echo $dataakhir;
		}
	}
    public function getRuteAntarSpot(){
		$tanggal=$this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getRuteAntarSpot'.$tanggal.'.json')) {
			$nopol = $this->input->post('NOPOL');
			$this->load->model('model_monitoringrute_semua');
			$result = $this->model_monitoringrute_semua->get_rute_antar_spot($nopol,$tanggal);
			echo json_encode($result->result());
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getRuteAntarSpot'.$tanggal.'.json');
			echo $dataakhir;
		}
    }
	public function getLocationTPAread(){
		$tanggal=$this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getLocationTPA'.$tanggal.'.json')) {
			$this->load->model('model_monitoringrute_semua');
			$result = $this->model_monitoringrute_semua->get_location_tpa();
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getLocationTPA'.'.json', 'w');
			fwrite($fp, json_encode($result->result()));
			fclose($fp);
			echo json_encode($result->result());
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$this->load->model('model_monitoringrute_semua');
				$result = $this->model_monitoringrute_semua->get_location_tpa();
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getLocationTPA'.'.json', 'w');
				fwrite($fp, json_encode($result->result()));
				fclose($fp);
			}
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getLocationTPA'.$tanggal.'.json');
			echo $dataakhir;
		}
	}
	public function getLocationTPA(){
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getLocationTPA'.$tanggal.'.json')) {
			$this->load->model('model_monitoringrute_semua');
			$result = $this->model_monitoringrute_semua->get_location_tpa();
			echo json_encode($result->result());
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getLocationTPA'.$tanggal.'.json');
			echo $dataakhir;
		}
	}
	
	public function getTotalJenisKendaraanAktifread(){
		$tanggal=$this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalJenisKendaraanAktif'.$tanggal.'.json')) {
			$this->load->model('model_monitoringrute_semua');
			$result = $this->model_monitoringrute_semua->get_total_jenis_kendaraan_aktif($tanggal);
			$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalJenisKendaraanAktif'.$tanggal.'.json', 'w');
			fwrite($fp, json_encode($result->result()));
			fclose($fp);
			echo json_encode($result->result());
		} else {
			if ($tanggal == date('Y-m-d'))
			{
				$this->load->model('model_monitoringrute_semua');
				$result = $this->model_monitoringrute_semua->get_total_jenis_kendaraan_aktif($tanggal);
				$fp = fopen($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalJenisKendaraanAktif'.$tanggal.'.json', 'w');
				fwrite($fp, json_encode($result->result()));
				fclose($fp);
			}			
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalJenisKendaraanAktif'.$tanggal.'.json');
			echo $dataakhir;
		}		
	}
			
    public function getTotalJenisKendaraanAktif(){
		$tanggal=$this->input->post('tanggal');
		if (!file_exists($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalJenisKendaraanAktif'.$tanggal.'.json')) {
			$this->load->model('model_monitoringrute_semua');
			$result = $this->model_monitoringrute_semua->get_total_jenis_kendaraan_aktif($tanggal);
			echo json_encode($result->result());
		} else {
			$dataakhir = file_get_contents($_SERVER['DOCUMENT_ROOT'].'/swat/assets/json/getTotalJenisKendaraanAktif'.$tanggal.'.json');
			echo $dataakhir;
		}
    }
}

?>