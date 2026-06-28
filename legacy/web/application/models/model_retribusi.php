<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_retribusi extends CI_Model
{
  function __construct()
  {

  }

  /*function get_all_retribusi(){
    $this->db->from('retribusi');
    return $this->db->get();
  }*/

  function get_all_retribusi(){
    return $this->db->query("
    SELECT ID_KATEGORI_RETRIBUSI, NAMA_KATEGORI_RETRIBUSI, TANGGAL,CONCAT('Rp ',FORMAT(JUMLAH,0)) as JUMLAH
    FROM retribusi;
    ");
  }

  /*function get_all_retribusi()
  {

    $this->db->select("ID_KATEGORI_RETRIBUSI, NAMA_KATEGORI_RETRIBUSI, TANGGAL, CONCAT('Rp ', FORMAT(JUMLAH,2)) as JUMLAH", false);
    return $this->db->get("retribusi");
  }*/

  function get_all_paging_sorting_retribusi($jtStartIndex,$jtPageSize,$jtSorting)
  {
    return $this->db->query("
    SELECT * FROM retribusi
    ORDER BY " . $jtSorting .
    " LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
    ");
  }

  function insert_retribusi($data_retribusi){
		$this->db->insert('retribusi',$data_retribusi);
	}

  function get_last_inserted_retribusi()
  {
    return $this->db->query("
    SELECT ID_KATEGORI_RETRIBUSI, NAMA_KATEGORI_RETRIBUSI, TANGGAL,FORMAT(JUMLAH,0) as JUMLAH
    FROM retribusi
		WHERE ID_KATEGORI_RETRIBUSI = LAST_INSERT_ID();
		");
  }

  function update_retribusi_by_id($id_kategori_retribusi,$data_retribusi)
  {
    $this->db->where('ID_KATEGORI_RETRIBUSI',$id_kategori_retribusi);
    $this->db->update('retribusi',$data_retribusi);
  }

  function delete_retribusi_by_id($retribusi)
  {
    $this->db->where('ID_KATEGORI_RETRIBUSI',$retribusi);
    $this->db->delete('retribusi');
  }
}
?>
