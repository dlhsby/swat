<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Menu extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(60);
	
		$this->load->model('model_menu');
		$data['all_menu'] = $this->model_menu->get_all_menu();
		$data['all_parent_menu'] = $this->model_menu->get_all_parent_menu();
		$this->template->set('title','Master Data Menu | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/menu/index',$data);
	}
	
	public function getmenubyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(60);
		
		$this->load->model('model_menu');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$namaMenu = $this->input->post('namaMenu');
		$parentMenu = $this->input->post('parentMenu');
		
		$all_menu = $this->model_menu->get_all_menu_by_filter($namaMenu,$parentMenu);
		$result = $this->model_menu->get_all_paging_sorting_menu_by_filter($namaMenu,$parentMenu,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_menu->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getmenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(60);

		$this->load->model('model_menu');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$MENU_ID = $this->input->get('$MENU_ID');
		$MENU_NAMA = $this->input->get('$MENU_NAMA');
		
		
		$all_menu = $this->model_menu->get_all_menu();
		$result = $this->model_menu->get_all_paging_sorting_menu($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_menu->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getmenuparent(){
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
	
	public function getstatusmenu(){
		$this->load->model('model_statusmenu');
		
		$all_menu = $this->model_statusmenu->get_all_statusmenu();
		
		$rows = array();
		if($all_menu->num_rows()>0){
			foreach($all_menu->result_array() as $menu){
				$dummy = array();
				$dummy["DisplayText"] = $menu["STATUSMENU_NAMA"];
			    $dummy["Value"] = $menu["STATUSMENU_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createmenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(60);
		
		$this->load->model('model_menu');
		
		$data_menu = array(
			'MENU_NAMA' => $this->input->post('MENU_NAMA'),
			'MENU_URI' => $this->input->post('MENU_URI'),
			'MENU_PARENT_ID' => $this->input->post('MENU_PARENT_ID'),
			'STATUSMENU_ID' => $this->input->post('STATUSMENU_ID')
		);
		$this->model_menu->insert_menu($data_menu);
		
		$lastInsertedMenu = $this->model_menu->get_last_inserted_menu();
		$rows = $lastInsertedMenu->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function updatemenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(60);
		
		$this->load->model('model_menu');
		$menu_id = $this->input->post('MENU_ID');
		$data_menu = array(
			'MENU_NAMA' => $this->input->post('MENU_NAMA'),
			'MENU_URI' => $this->input->post('MENU_URI'),
			'MENU_PARENT_ID' => $this->input->post('MENU_PARENT_ID'),
			'STATUSMENU_ID' => $this->input->post('STATUSMENU_ID')
		);
		$this->model_menu->update_menu_by_id($menu_id,$data_menu);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletemenu(){
		$this->auth->restrict();
		$this->auth->cek_menu(60);
		
		$this->load->model('model_menu');
		$menu_id = $this->input->post('MENU_ID');
		
		$this->model_menu->delete_menu_by_id($menu_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>