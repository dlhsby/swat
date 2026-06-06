<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Retribusi extends CI_Controller
{
  public function __construct()
  {
    parent::__construct();
    $this->load->model('model_retribusi');
  }

  public function index()
  {
    $this->auth->restrict();
		$this->auth->cek_menu(107);

		$this->template->set('title','Rekapitulasi Kendaraan | SWAT DKP');
		$this->template->load('template','transaksi/retribusi/index');
  }

  public function getretribusi()
  {
    $this->auth->restrict();
    $this->auth->cek_menu(107);

    $jtStartIndex =  $this->input->get('jtStartIndex');
		$jtPageSize =  $this->input->get('jtPageSize');
		$jtSorting = $this->input->get('jtSorting');

    $all_retribusi = $this->model_retribusi->get_all_retribusi();
    $result = $this->model_retribusi->get_all_paging_sorting_retribusi($jtStartIndex,$jtPageSize,$jtSorting);

    $rows = $result->result_array();
    $recordCount = $all_retribusi->num_rows();

    $jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['TotalRecordCount'] = $recordCount;
		$jTableResult['Records'] = $rows;

    print json_encode($jTableResult);
  }

  public function createretribusi()
  {
    $this->auth->restrict();
    $this->auth->cek_menu(107);

    $data_retribusi = array(
      'ID_KATEGORI_RETRIBUSI' => $this->input->post('ID_KATEGORI_RETRIBUSI'),
      'NAMA_KATEGORI_RETRIBUSI' => $this->input->post('NAMA_KATEGORI_RETRIBUSI'),
      'TANGGAL' => $this->input->post('TANGGAL'),
      'JUMLAH' => $this->input->post('JUMLAH')
    );
    $this->model_retribusi->insert_retribusi($data_retribusi);

    $lastInsertedRetribusi = $this->model_retribusi->get_last_inserted_retribusi();
    $rows = $lastInsertedRetribusi->result_array();

    $jTableResult = array();
		$jTableResult['Result'] = "OK";
		$jTableResult['Record'] = $rows;
		print json_encode($jTableResult);
  }

  public function updateretribusi()
  {
    $this->auth->restrict();
    $this->auth->cek_menu(107);

    $id_kategori_retribusi = $this->input->post('ID_KATEGORI_RETRIBUSI');

    $data_retribusi = array(
      'ID_KATEGORI_RETRIBUSI' => $this->input->post('ID_KATEGORI_RETRIBUSI'),
      'NAMA_KATEGORI_RETRIBUSI' => $this->input->post('NAMA_KATEGORI_RETRIBUSI'),
      'TANGGAL' => $this->input->post('TANGGAL'),
      'JUMLAH' => $this->input->post('JUMLAH')
    );

    $this->model_retribusi->update_retribusi_by_id($id_kategori_retribusi,$data_retribusi);

    $jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
  }

  public function deleteretribusi()
  {
    $this->auth->restrict();
    $this->auth->cek_menu(107);

    $retribusi = $this->input->post('ID_KATEGORI_RETRIBUSI');
    $this->model_retribusi->delete_retribusi_by_id($retribusi);

    $jTableResult = array();
		$jTableResult['Result'] = "OK";
		print json_encode($jTableResult);
  }


}
