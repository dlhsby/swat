<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Hakaksesmenu extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(63);
	
		$this->load->model('model_hakaksesmenu');
		$data['all_hakaksesmenu'] = $this->model_hakaksesmenu->get_all_hakaksesmenu_with_menu_and_hakakses();

		$this->template->set('title','Master Data Hak Akses Menu | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/hakaksesmenu/index',$data);
	}
	
	public function gethakaksesmenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(63);

		$this->load->model('model_hakaksesmenu');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_hakaksesmenu = $this->model_hakaksesmenu->get_all_hakaksesmenu();
		$result = $this->model_hakaksesmenu->get_all_paging_sorting_hakaksesmenu($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_hakaksesmenu->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function gethakakses(){
		$this->load->model('model_hakakses');
		
		$all_hakakses = $this->model_hakakses->get_all_hakakses();
		
		$rows = array();
		if($all_hakakses->num_rows()>0){
			foreach($all_hakakses->result_array() as $hakakses){
				$dummy = array();
				$dummy["DisplayText"] = $hakakses["HAKAKSES_NAMA"];
			    $dummy["Value"] = $hakakses["HAKAKSES_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getmenu(){
		$this->load->model('model_menu');
		
		$all_menu = $this->model_menu->get_all_menu();
		
		$rows = array();
		if($all_menu->num_rows()>0){
			foreach($all_menu->result_array() as $menu){
				$dummy = array();
				$dummy["DisplayText"] = $menu["MENU_NAMA"];
			    $dummy["Value"] = $menu["MENU_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createhakaksesmenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(63);
		
		$this->load->model('model_hakaksesmenu');
		
		$data_hakaksesmenu = array(
			'HAKAKSES_ID' => $this->input->post('HAKAKSES_ID'),
			'MENU_ID' => $this->input->post('MENU_ID')
		);
		
		$hakaksesmenu = $this->model_hakaksesmenu->get_hakaksesmenu_by_hakakses_and_menu($this->input->post('HAKAKSES_ID'),$this->input->post('MENU_ID'));
		if($hakaksesmenu->num_rows() <= 0){
			$this->model_hakaksesmenu->insert_hakaksesmenu($data_hakaksesmenu);
		
			$lastInsertedHakaksesmenu = $this->model_hakaksesmenu->get_last_inserted_hakaksesmenu();
			$rows = $lastInsertedHakaksesmenu->result_array();
			
			$jTableResult = array();
			$jTableResult['Result'] = "OK";		
			$jTableResult['Record'] = $rows;
			print json_encode($jTableResult);	
		}
		else{
			$jTableResult = array();
			$jTableResult['Result'] = "ERROR";
			print json_encode($jTableResult);	
		}
	}
	
	public function updatehakaksesmenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(63);
		
		$this->load->model('model_hakaksesmenu');
		$hakaksesmenu_id = $this->input->post('HAKAKSESMENU_ID');
		
		$data_hakaksesmenu = array(
			'HAKAKSES_ID' => $this->input->post('HAKAKSES_ID'),
			'MENU_ID' => $this->input->post('MENU_ID')
		);
		$this->model_hakaksesmenu->update_hakaksesmenu_by_id($hakaksesmenu_id,$data_hakaksesmenu);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletehakaksesmenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(63);
		
		$this->load->model('model_hakaksesmenu');
		$hakaksesmenu_id = $this->input->post('HAKAKSESMENU_ID');
		
		$this->model_hakaksesmenu->delete_hakaksesmenu_by_id($hakaksesmenu_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>