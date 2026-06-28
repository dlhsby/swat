<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Kepemilikansim extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(69);
	
		$this->load->model('model_kepemilikansim');
		$data['all_kepemilikansim'] = $this->model_kepemilikansim->get_all_kepemilikansim_with_pengemudi_and_sim();

		$this->template->set('title','Master Data Kepemilikan Sim | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/kepemilikansim/index',$data);
	}
	
	public function getkepemilikansim(){
		$this->auth->restrict();
		$this->auth->cek_menu(69);

		$this->load->model('model_kepemilikansim');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_kepemilikansim = $this->model_kepemilikansim->get_all_kepemilikansim();
		$result = $this->model_kepemilikansim->get_all_paging_sorting_kepemilikansim($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_kepemilikansim->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getpengemudi(){
		$this->load->model('model_pengemudi');
		
		$all_pengemudi = $this->model_pengemudi->get_all_pengemudi();
		
		$rows = array();
		if($all_pengemudi->num_rows()>0){
			foreach($all_pengemudi->result_array() as $pengemudi){
				$dummy = array();
				$dummy["DisplayText"] = $pengemudi["PENGEMUDI_NAMA"];
			    $dummy["Value"] = $pengemudi["PENGEMUDI_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getsim(){
		$this->load->model('model_sim');
		
		$all_sim = $this->model_sim->get_all_sim();
		
		$rows = array();
		if($all_sim->num_rows()>0){
			foreach($all_sim->result_array() as $sim){
				$dummy = array();
				$dummy["DisplayText"] = $sim["SIM_NAMA"];
			    $dummy["Value"] = $sim["SIM_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createkepemilikansim(){
		$this->auth->restrict();
		$this->auth->cek_menu(69);
		
		$this->load->model('model_kepemilikansim');
		
		$data_kepemilikansim = array(
			'PENGEMUDI_ID' => $this->input->post('PENGEMUDI_ID'),
			'SIM_ID' => $this->input->post('SIM_ID'),
			'KEPEMILIKANSIM_NOMORSIM' => $this->input->post('KEPEMILIKANSIM_NOMORSIM'),
			'KEPEMILIKANSIM_MASABERLAKUSIM' => $this->input->post('KEPEMILIKANSIM_MASABERLAKUSIM')
		);
		$this->model_kepemilikansim->insert_kepemilikansim($data_kepemilikansim);
	
		$lastInsertedKepemilikansim = $this->model_kepemilikansim->get_last_inserted_kepemilikansim();
		$rows = $lastInsertedKepemilikansim->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatekepemilikansim(){
		$this->auth->restrict();
		$this->auth->cek_menu(69);
		
		$this->load->model('model_kepemilikansim');
		$kepemilikansim_id = $this->input->post('KEPEMILIKANSIM_ID');
		
		$data_kepemilikansim = array(
			'PENGEMUDI_ID' => $this->input->post('PENGEMUDI_ID'),
			'SIM_ID' => $this->input->post('SIM_ID'),
			'KEPEMILIKANSIM_NOMORSIM' => $this->input->post('KEPEMILIKANSIM_NOMORSIM'),
			'KEPEMILIKANSIM_MASABERLAKUSIM' => $this->input->post('KEPEMILIKANSIM_MASABERLAKUSIM')
		);
		$this->model_kepemilikansim->update_kepemilikansim_by_id($kepemilikansim_id,$data_kepemilikansim);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletekepemilikansim(){
		$this->auth->restrict();
		$this->auth->cek_menu(69);
		
		$this->load->model('model_kepemilikansim');
		$kepemilikansim_id = $this->input->post('KEPEMILIKANSIM_ID');
		
		$this->model_kepemilikansim->delete_kepemilikansim_by_id($kepemilikansim_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>