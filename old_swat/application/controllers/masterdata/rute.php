<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Rute extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(73);
	
		$this->load->model('model_rute');
		$this->load->model('model_kategorirute');
		$this->load->model('model_spot');
		
		$data['all_rute'] = $this->model_rute->get_all_rute();
		$data['all_kategorirute'] = $this->model_kategorirute->get_all_kategorirute();
		$data['all_spot'] = $this->model_spot->get_all_spot();
		
		$this->template->set('title','Master Data Rute | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/rute/index',$data);
	}
	
	public function getrute(){
		$this->auth->restrict();
		$this->auth->cek_menu(73);

		$this->load->model('model_rute');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_rute = $this->model_rute->get_all_rute();
		$result = $this->model_rute->get_all_paging_sorting_rute($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_rute->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getrutebyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(73);

		$this->load->model('model_rute');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$kategoriRute = $this->input->post('kategoriRute');
		$asalSpot = $this->input->post('asalSpot');
		$tujuanSpot = $this->input->post('tujuanSpot');
		
		
		$all_rute = $this->model_rute->get_all_rute_by_filter($kategoriRute,$asalSpot,$tujuanSpot);
		$result = $this->model_rute->get_all_paging_sorting_rute_by_filter($kategoriRute,$asalSpot,$tujuanSpot,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_rute->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	
	public function getkategorirute(){
		$this->load->model('model_kategorirute');
		
		$all_kategorirute = $this->model_kategorirute->get_all_kategorirute();
		
		$rows = array();
		if($all_kategorirute->num_rows()>0){
			foreach($all_kategorirute->result_array() as $kategorirute){
				$dummy = array();
				$dummy["DisplayText"] = $kategorirute["KATEGORIRUTE_NAMA"];
			    $dummy["Value"] = $kategorirute["KATEGORIRUTE_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getspotasal(){
		$this->load->model('model_spot');
		
		$all_spot = $this->model_spot->get_all_spot();
		
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
	
	public function getspottujuan(){
		$this->load->model('model_spot');
		
		$all_spot = $this->model_spot->get_all_spot();
		
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
	
	public function createrute(){
		$this->auth->restrict();
		$this->auth->cek_menu(73);
		
		$this->load->model('model_rute');
		
		$data_rute = array(
			'KATEGORIRUTE_ID' => $this->input->post('KATEGORIRUTE_ID'),
			'SPOT_ASAL_ID' => $this->input->post('SPOT_ASAL_ID'),
			'SPOT_TUJUAN_ID' => $this->input->post('SPOT_TUJUAN_ID'),
			'RUTE_JARAK' => $this->input->post('RUTE_JARAK')
		);
		$this->model_rute->insert_rute($data_rute);
	
		$lastInsertedRute = $this->model_rute->get_last_inserted_rute();
		$rows = $lastInsertedRute->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updaterute(){
		$this->auth->restrict();
		$this->auth->cek_menu(73);
		
		$this->load->model('model_rute');
		$rute_id = $this->input->post('RUTE_ID');
		
		$data_rute = array(
			'KATEGORIRUTE_ID' => $this->input->post('KATEGORIRUTE_ID'),
			'SPOT_ASAL_ID' => $this->input->post('SPOT_ASAL_ID'),
			'SPOT_TUJUAN_ID' => $this->input->post('SPOT_TUJUAN_ID'),
			'RUTE_JARAK' => $this->input->post('RUTE_JARAK')
		);
		$this->model_rute->update_rute_by_id($rute_id,$data_rute);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deleterute(){
		$this->auth->restrict();
		$this->auth->cek_menu(73);
		
		$this->load->model('model_rute');
		$rute_id = $this->input->post('RUTE_ID');
		
		$this->model_rute->delete_rute_by_id($rute_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>