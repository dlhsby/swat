<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Pengemudi extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}
	
	public function index(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);
	
		$this->load->model('model_pengemudi');
		$this->load->model('model_statuskepegawaian');
		$this->load->model('model_spot');
		
		$data['all_pengemudi'] = $this->model_pengemudi->get_all_pengemudi_with_kepemilikansim_and_sim_and_statuskepegawaian_and_spot();
		$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
		$data['all_statuskepegawaian'] = $this->model_statuskepegawaian->get_all_statuskepegawaian();
		
		$this->template->set('title','Master Data Pengemudi | SWAT DKP Surabaya');
		$this->template->load('template','masterdata/pengemudi/index',$data);
	}
	
	public function tambahpengemudi(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);
		
		$this->load->library('form_validation');
		$this->load->model('model_pengemudi');
		$this->load->model('model_spot');
		$this->load->model('model_statuskepegawaian');
		
		$this->form_validation->set_rules('pool','Pool','trim|required');
		$this->form_validation->set_rules('statuskepegawaian','Status Kepegawaian','trim|required');
		$this->form_validation->set_rules('nama','Nama Pengemudi','trim|required');
		$this->form_validation->set_rules('ktp','Nomor KTP','trim|required');
		$this->form_validation->set_rules('alamatasal','Alamat Asal','trim|required');
		$this->form_validation->set_rules('alamatdomisili','Alamat Domisili','trim|required');
		$this->form_validation->set_rules('tanggallahir','Tanggal Lahir','trim|required');
		$this->form_validation->set_rules('kontak','Kontak','trim|required');
		$this->form_validation->set_rules('pelatihansafety','Pelatihan Safety','trim');
		//$this->form_validation->set_rules('foto','Foto','trim');
		$this->form_validation->set_rules('keterangan','Keterangan','trim');
		
		$this->form_validation->set_error_delimiters(' <span style="color:#FF0000">', '</span>');
		
		if($this->form_validation->run()==FALSE){
			$data['all_pool'] = $this->model_spot->get_spot_by_kategorispot(1);
			$data['all_statuskepegawaian'] = $this->model_statuskepegawaian->get_all_statuskepegawaian();
			$this->template->set('title','Tambah Data Pengemudi Baru | SWAT DKP Surabaya');
			$this->template->load('template','masterdata/pengemudi/tambahpengemudi',$data);
		}
		else{
			$data_pengemudi = array(
				'SPOT_POOL_ID' => $this->input->post('pool'),
				'STATUSKEPEGAWAIAN_ID' => $this->input->post('statuskepegawaian'),
				'PENGEMUDI_NAMA' => $this->input->post('nama'),
				'PENGEMUDI_NOMORKTP' => $this->input->post('ktp'),
				'PENGEMUDI_ALAMATASAL' => $this->input->post('alamatasal'),
				'PENGEMUDI_ALAMATDOMISILI' => $this->input->post('alamatdomisili'),
				'PENGEMUDI_TANGGALLAHIR' => $this->input->post('tanggallahir'),
				'PENGEMUDI_KONTAK' => $this->input->post('kontak'),
				'PENGEMUDI_PELATIHANSAFETY' => $this->input->post('pelatihansafety'),
				//'PENGEMUDI_FOTO' => $this->input->post('foto'),
				'PENGEMUDI_KETERANGAN' => $this->input->post('keterangan')
			);
			$this->model_pengemudi->insert_pengemudi($data_pengemudi);
			redirect('masterdata/pengemudi');
		}
	}
	
	public function getpengemudi(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);

		$this->load->model('model_pengemudi');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		
		$all_pengemudi = $this->model_pengemudi->get_all_pengemudi();
		$result = $this->model_pengemudi->get_all_paging_sorting_pengemudi($jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_pengemudi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getpengemudibyfilter(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);

		$this->load->model('model_pengemudi');
		
		$jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');
		$nikPengemudi = $this->input->post('nikPengemudi');
		$namaPengemudi = $this->input->post('namaPengemudi');
		$poolPengemudi = $this->input->post('poolPengemudi');
		$statusKepegawaian = $this->input->post('statusKepegawaian');
		
		$all_pengemudi = $this->model_pengemudi->get_all_pengemudi_by_filter($nikPengemudi,$namaPengemudi,$poolPengemudi,$statusKepegawaian);
		$result = $this->model_pengemudi->get_all_paging_sorting_pengemudi_by_filter($nikPengemudi,$namaPengemudi,$poolPengemudi,$statusKepegawaian,$jtStartIndex,$jtPageSize,$jtSorting);
		
		$rows = $result->result_array();
		$recordCount = $all_pengemudi->num_rows();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function getspot(){
		$this->load->model('model_spot');
		
		$all_spot = $this->model_spot->get_spot_by_kategorispot(1);
		
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
	
	public function getstatuskepegawaian(){
		$this->load->model('model_statuskepegawaian');
		
		$all_statuskepegawaian = $this->model_statuskepegawaian->get_all_statuskepegawaian();
		
		$rows = array();
		if($all_statuskepegawaian->num_rows()>0){
			foreach($all_statuskepegawaian->result_array() as $statuskepegawaian){
				$dummy = array();
				$dummy["DisplayText"] = $statuskepegawaian["STATUSKEPEGAWAIAN_NAMA"];
			    $dummy["Value"] = $statuskepegawaian["STATUSKEPEGAWAIAN_ID"];
			    $rows[] = $dummy;
			}
		}
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Options'] = $rows;
		print json_encode($jTableResult);
	}
	
	public function createpengemudi(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);
		
		$this->load->model('model_pengemudi');
		
		$data_pengemudi = array(
			'SPOT_POOL_ID' => $this->input->post('SPOT_POOL_ID'),
			'STATUSKEPEGAWAIAN_ID' => $this->input->post('STATUSKEPEGAWAIAN_ID'),
			'PENGEMUDI_NAMA' => $this->input->post('PENGEMUDI_NAMA'),
			'PENGEMUDI_NOMORKTP' => $this->input->post('PENGEMUDI_NOMORKTP'),
			'PENGEMUDI_ALAMATASAL' => $this->input->post('PENGEMUDI_ALAMATASAL'),
			'PENGEMUDI_ALAMATDOMISILI' => $this->input->post('PENGEMUDI_ALAMATDOMISILI'),
			'PENGEMUDI_TANGGALLAHIR' => $this->input->post('PENGEMUDI_TANGGALLAHIR'),
			'PENGEMUDI_KONTAK' => $this->input->post('PENGEMUDI_KONTAK'),
			'PENGEMUDI_PELATIHANSAFETY' => $this->input->post('PENGEMUDI_PELATIHANSAFETY'),
			//'PENGEMUDI_FOTO' => $this->input->post('PENGEMUDI_FOTO'),
			'PENGEMUDI_KETERANGAN' => $this->input->post('PENGEMUDI_KETERANGAN')
		);
		$this->model_pengemudi->insert_pengemudi($data_pengemudi);
	
		$lastInsertedPengemudi = $this->model_pengemudi->get_last_inserted_pengemudi();
		$rows = $lastInsertedPengemudi->result_array();
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";		
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);	
	}
	
	public function updatepengemudi(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);
		
		$this->load->model('model_pengemudi');
		$pengemudi_id = $this->input->post('PENGEMUDI_ID');
		
		$data_pengemudi = array(
			'SPOT_POOL_ID' => $this->input->post('SPOT_POOL_ID'),
			'STATUSKEPEGAWAIAN_ID' => $this->input->post('STATUSKEPEGAWAIAN_ID'),
			'PENGEMUDI_NAMA' => $this->input->post('PENGEMUDI_NAMA'),
			'PENGEMUDI_NOMORKTP' => $this->input->post('PENGEMUDI_NOMORKTP'),
			'PENGEMUDI_ALAMATASAL' => $this->input->post('PENGEMUDI_ALAMATASAL'),
			'PENGEMUDI_ALAMATDOMISILI' => $this->input->post('PENGEMUDI_ALAMATDOMISILI'),
			'PENGEMUDI_TANGGALLAHIR' => $this->input->post('PENGEMUDI_TANGGALLAHIR'),
			'PENGEMUDI_KONTAK' => $this->input->post('PENGEMUDI_KONTAK'),
			'PENGEMUDI_PELATIHANSAFETY' => $this->input->post('PENGEMUDI_PELATIHANSAFETY'),
			//'PENGEMUDI_FOTO' => $this->input->post('PENGEMUDI_FOTO'),
			'PENGEMUDI_KETERANGAN' => $this->input->post('PENGEMUDI_KETERANGAN')
		);
		$this->model_pengemudi->update_pengemudi_by_id($pengemudi_id,$data_pengemudi);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}
	
	public function deletepengemudi(){
		$this->auth->restrict();
		$this->auth->cek_menu(70);
		
		$this->load->model('model_pengemudi');
		$pengemudi_id = $this->input->post('PENGEMUDI_ID');
		
		$this->model_pengemudi->delete_pengemudi_by_id($pengemudi_id);
		
		$jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
	}	
}

?>