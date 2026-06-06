<?php

class Tonasetps extends CI_Controller{

    public function __construct() {
        parent::__construct();
    }

    public function index(){

        $this->auth->restrict();

        $this->load->model('model_spot');
        $this->load->model('model_monitoringtonasesampahsemua');

        date_default_timezone_set('Asia/Jakarta');

        $tanggalDari = (new \DateTime())->format('d-m-Y');
        $tanggalSampai = (new \DateTime())->format('d-m-Y');
		
		$tanggalDari = explode("-", $tanggalDari);
		if (count($tanggalDari)>2) {
			$tanggalDari = $tanggalDari[2] . "-" . $tanggalDari[1] . "-" . $tanggalDari[0];
		} else {
		    $tanggalDari = date('Y-m-d');
		}

        $tanggalSampai = explode("-", $tanggalSampai);
        if (count($tanggalSampai)>2) {
			$tanggalSampai = $tanggalSampai[2] . "-" . $tanggalSampai[1] . "-" . $tanggalSampai[0];
		} else {
		  $tanggalSampai = date('Y-m-d');
		}

        $data['tanggalDari'] = $tanggalDari;
        $data['tanggalSampai'] = $tanggalSampai;
        $data['all_TPS'] = $this->model_spot->get_spot_by_kategorispot(3);
        $data['total_tonase'] = 0;
        $this->template->set('title','Rekap Data Tonase TPS | SWAT DKP');
        $this->template->load('template','analisadata/tonasetps/index', $data);

    }

    public function getlist(){
	    //ini_set('max_execution_time',0);
        //ini_set('memory_limit','4048M');

        $this->auth->restrict();

        $this->load->model('model_monitoringtonasesampahsemua');

        $jtStartIndex = $this->input->get('jtStartIndex');
        $jtPageSize = $this->input->get('jtPageSize');
        $jtSorting = $this->input->get('jtSorting');

        $daritanggalTransaksi = $this->input->post('daritanggalTransaksi');
        $daritanggalTransaksi = explode("-", $daritanggalTransaksi);
		if (count($daritanggalTransaksi)>2) {
			$daritanggalTransaksi = $daritanggalTransaksi[2] . "-" . $daritanggalTransaksi[1] . "-" . $daritanggalTransaksi[0];
		} else {
		   $daritanggalTransaksi = date('Y-m-d');
		}

        $sampaitanggalTransaksi = $this->input->post('sampaitanggalTransaksi');
        $sampaitanggalTransaksi = explode("-", $sampaitanggalTransaksi);
        if (count($sampaitanggalTransaksi)>2) {
			$sampaitanggalTransaksi = $sampaitanggalTransaksi[2] . "-" . $sampaitanggalTransaksi[1] . "-" . $sampaitanggalTransaksi[0];
		} else {
		  $sampaitanggalTransaksi = date('Y-m-d');
		}

        $namaTPS = rawurldecode($this->input->post('namaTPS'));
        /*
        $vol_tps = $this->model_monitoringtonasesampahsemua->get_vol_tps($daritanggalTransaksi, $sampaitanggalTransaksi,$namaTPS);
        */

        if (!isset($namaTPS)||(trim($namaTPS)=='')||(trim($namaTPS)=='-')) {
            //$result = $this->model_monitoringtonasesampahsemua->get_all_paging_sorting_vol_tps($jtStartIndex, $jtPageSize, $jtSorting, "-", "-", "-");
			$result = $this->model_monitoringtonasesampahsemua->get_all_paging_sorting_vol_tps($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi, $sampaitanggalTransaksi, "-");
        } else {
            $result = $this->model_monitoringtonasesampahsemua->get_all_paging_sorting_vol_tps($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi, $sampaitanggalTransaksi, $namaTPS);
        }

        $rows = $result->result_array();
        //$recordCount = $vol_tps->num_rows();
        $recordCount = $result->num_rows();

        $jTableResult = array();
        $jTableResult['Result'] = "OK";
        $jTableResult['TotalRecordCount'] = $recordCount;
        $jTableResult['Records'] = $rows;
        print json_encode($jTableResult);
    }
	
	public function getjumlahtotal() {
        $daritanggalTransaksi = $this->input->post('daritanggalTransaksi');
        $sampaitanggalTransaksi = $this->input->post('sampaitanggalTransaksi');
        $daritanggalTransaksi = explode("-", $daritanggalTransaksi);
        if (count($daritanggalTransaksi)>2) {
            $daritanggalTransaksi = $daritanggalTransaksi[2] . "-" . $daritanggalTransaksi[1] . "-" . $daritanggalTransaksi[0];
        } else {
            $daritanggalTransaksi = date('Y-m-d');
        }
        $sampaitanggalTransaksi = explode("-", $sampaitanggalTransaksi);
        if (count($sampaitanggalTransaksi)>2) {
            $sampaitanggalTransaksi = $sampaitanggalTransaksi[2] . "-" . $sampaitanggalTransaksi[1] . "-" . $sampaitanggalTransaksi[0];
        } else {
            $sampaitanggalTransaksi = date('Y-m-d');
        }
        $namaTPS = rawurldecode($this->input->post('namaTPS'));
        $this->load->model('model_monitoringtonasesampahsemua');
        $jmltotal = $this->model_monitoringtonasesampahsemua->get_vol_tps($daritanggalTransaksi, $sampaitanggalTransaksi, $namaTPS);
        $total_tonase = 0;
        foreach ($jmltotal->result() as $jmltotal_item) {
            $total_tonase = $total_tonase + $jmltotal_item->Tonase_Total;
        }
        echo "Total Tonase : " . number_format($total_tonase/1000, 2, '.', ',') . " Ton";
    }
}

?>