<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Hakakses extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(61);

		$this->load->model('model_masterdata_hakakses');
		$data['all_hakakses'] = $this->model_masterdata_hakakses->get_all_hakakses();

		$this->template->set('title','Master Data Hak Akses| SWAT DKP Surabaya');
		$this->template->load('template','masterdata/hakakses/index',$data);
	}

	public function gethakakses(){
		$this->auth->restrict();
		$this->auth->cek_menu(61);

		$this->load->model('model_hakakses');

		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');

		$all_hakakses = $this->model_hakakses->get_all_hakakses();
		$result = $this->model_hakakses->get_all_paging_sorting_hakakses($jtStartIndex,$jtPageSize,$jtSorting);

		$rows = $result->result_array();
		$recordCount = $all_hakakses->num_rows();

		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}

	public function createhakakses(){
		$this->auth->restrict();
		$this->auth->cek_menu(61);

		$this->load->model('model_hakakses');

		$data_hakakses = array(
			'HAKAKSES_NAMA' => $this->input->post('HAKAKSES_NAMA')
		);
		$this->model_hakakses->insert_hakakses($data_hakakses);

		$lastInsertedHakakses = $this->model_hakakses->get_last_inserted_hakakses();
		$rows = $lastInsertedHakakses->result_array();

		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);
	}

	public function updatehakakses(){
		$this->auth->restrict();
		$this->auth->cek_menu(61);

		$this->load->model('model_hakakses');
		$hakakses_id = $this->input->post('HAKAKSES_ID');

		$data_hakakses = array(
			'HAKAKSES_NAMA' => $this->input->post('HAKAKSES_NAMA')
		);
		$this->model_hakakses->update_hakakses_by_id($hakakses_id,$data_hakakses);

		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}

	public function deletehakakses(){
		$this->auth->restrict();
		$this->auth->cek_menu(61);

		$this->load->model('model_hakakses');
		$hakakses_id = $this->input->post('HAKAKSES_ID');

		$this->model_hakakses->delete_hakakses_by_id($hakakses_id);

		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
}

?>
