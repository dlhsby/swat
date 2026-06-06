<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Rute extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);

		$this->template->set('title','Monitoring Rute | SWAT DKP Surabaya');
		$this->template->load('template_monitoring','monitoring/rute/index');
	}
	
	public function map(){
		$this->auth->restrict();
		$this->auth->cek_menu(50);
	
		/*$this->load->model('model_kendaraan');
		$data['all_kendaraan'] = $this->model_kendaraan->get_all_kendaraan_with_aplikasi_and_kategorikendaraan_and_statuskendaraan_and_spot_and_kategorisumbersampah();*/

		$this->template->set('title','Monitoring Rute | SWAT DKP Surabaya');
		$this->template->load('template','monitoring/rute/map');
	}

    public function getAllRute()
    {
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute');
        $result = $this->model_monitoringrute->get_all_rute($tanggal);

        echo json_encode($result->result());
    }
    public function getSepuluhRuteTerakhir(){
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute');
        $result = $this->model_monitoringrute->get_sepuluh_rute_terakhir($tanggal);

        echo json_encode($result->result());
    }
    public function getLimaRuteTerakhir(){
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute');
        $result = $this->model_monitoringrute->get_lima_rute_terakhir($tanggal);

        echo json_encode($result->result());
    }
    public function getRuteAntarSpot(){
		$tanggal=$this->input->post('tanggal');
        $nopol = $this->input->post('NOPOL');
        $this->load->model('model_monitoringrute');
        $result = $this->model_monitoringrute->get_rute_antar_spot($nopol,$tanggal);

        echo json_encode($result->result());
    }
	public function getLocationTPA(){
		$this->load->model('model_monitoringrute');
        $result = $this->model_monitoringrute->get_location_tpa();

        echo json_encode($result->result());
	}

    public function getTotalJenisKendaraanAktif(){
		$tanggal=$this->input->post('tanggal');
        $this->load->model('model_monitoringrute');
        $result = $this->model_monitoringrute->get_total_jenis_kendaraan_aktif($tanggal);

        echo json_encode($result->result());
    }
}

?>