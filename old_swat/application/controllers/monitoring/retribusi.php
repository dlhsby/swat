<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Retribusi extends CI_Controller
{
  public function __construct()
  {
    parent::__construct();
  }

  public function get_retribusi_perbulan(){
		$tanggal = $this->input->post('tanggal');
        $this->load->model('model_monitoring_retribusi');
        $result = $this->model_monitoring_retribusi->get_all_retribusi_perbulan($tanggal);
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
