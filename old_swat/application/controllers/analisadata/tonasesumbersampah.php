<?php

class Tonasesumbersampah extends CI_Controller
{

    public function __construct()
    {
        parent::__construct();
    }

    public function index()
    {
        $this->auth->restrict();

        $this->load->model('model_monitoringtonasesampahsemua');

        date_default_timezone_set('Asia/Jakarta');
        $tanggalDari = (new \DateTime())->format('Y-m-d');
        $tanggalSampai = (new \DateTime())->format('Y-m-d');

        //$data['tanggalDari'] = $tanggalDari;
        //$data['tanggalSampai'] = $tanggalSampai;
        $data['tanggalDari'] = date('d-m-Y');
        $data['tanggalSampai'] = date('d-m-Y');
        
		$all_tonase_sumber = $this->model_monitoringtonasesampahsemua->get_all_tonase_sumber_2($tanggalDari, $tanggalSampai);

        $total_tonase = 0;        
		foreach ($all_tonase_sumber->result() as $tonasesumber) {
            $total_tonase = $total_tonase + $tonasesumber->total_sampah_dari_sumber;
        }
		
        $data['total_tonase'] = number_format($total_tonase/1000, 2, '.', ',') . " Ton";
        $this->template->set('title', 'Rekap Data Tonase Sumber Sampah | SWAT DKP');
        $this->template->load('template', 'analisadata/tonasesumbersampah/index', $data);
    }

    public function gettotallist()
    {
        $daritanggalTransaksi = $this->input->post('daritanggalTransaksi');
        $daritanggalTransaksi = explode("-", $daritanggalTransaksi);
		if (count($daritanggalTransaksi)>1) {
			$daritanggalTransaksi = $daritanggalTransaksi[2] . "-" . $daritanggalTransaksi[1] . "-" . $daritanggalTransaksi[0];
		}
		
        $sampaitanggalTransaksi = $this->input->post('sampaitanggalTransaksi');
        $sampaitanggalTransaksi = explode("-", $sampaitanggalTransaksi);
        if (count($sampaitanggalTransaksi)>1) {
			$sampaitanggalTransaksi = $sampaitanggalTransaksi[2] . "-" . $sampaitanggalTransaksi[1] . "-" . $sampaitanggalTransaksi[0];
		}
		
        $this->load->model('model_monitoringtonasesampahsemua');
        $all_tonase_sumber = $this->model_monitoringtonasesampahsemua->get_all_tonase_sumber_2($daritanggalTransaksi, $sampaitanggalTransaksi);
        $total_tonase = 0;
        foreach ($all_tonase_sumber->result() as $tonasesumber) {
            $total_tonase = $total_tonase + $tonasesumber->total_sampah_dari_sumber;
        }
        echo "Total Tonase : " . number_format($total_tonase/1000, 2, '.', ',') . " Ton";
    }

    public function getlist()
    {
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
				
        $all_tonase_sumber = $this->model_monitoringtonasesampahsemua->get_all_tonase_sumber_2($daritanggalTransaksi, $sampaitanggalTransaksi);
        $total_tonase = 0;
        foreach ($all_tonase_sumber->result() as $tonasesumber) {
            $total_tonase = $total_tonase + $tonasesumber->total_sampah_dari_sumber;
        }
        $data['total_tonase'] = number_format($total_tonase/1000, 2, '.', ',') . " Ton";
        $result = $this->model_monitoringtonasesampahsemua->get_all_paging_sorting_all_tonase_sumber($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi, $sampaitanggalTransaksi);

        $rows = $result->result_array();
        $recordCount = $all_tonase_sumber->num_rows();

        $jTableResult = array();
        $jTableResult['Result'] = "OK";
        $jTableResult['TotalRecordCount'] = $recordCount;
        $jTableResult['Records'] = $rows;
        print json_encode($jTableResult);
    }

}

?>