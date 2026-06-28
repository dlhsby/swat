<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kategorispot extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kategori Spot ------------------------------------------------------------
	function get_all_kategorispot(){
		$this->db->from('kategorispot');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_kategorispot($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM kategorispot 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_kategorispot_by_id($kategorispot_id){
		$this->db->where('KATEGORISPOT_ID',$kategorispot_id);
		return $this->db->get('kategorispot');
	}
	//End of Get Data Kategori Spot------------------------------------------------------------
	
	//Begin of Insert Data Kategori Spot ------------------------------------------------------------
	function insert_kategorispot($new_kategorispot){
		$this->db->insert('kategorispot',$new_kategorispot);
	}
	
	function get_last_inserted_kategorispot(){
		return $this->db->query("
			SELECT * FROM kategorispot 
			WHERE kategorispot.KATEGORISPOT_ID = LAST_INSERT_ID();
		");
	}
	//End of Insert Data Kategori Spot  ------------------------------------------------------------
	
	//Begin of Update Data Kategori Spot ------------------------------------------------------------
	function update_kategorispot_by_id($kategorispot_id,$updated_kategorispot){
		$this->db->where('KATEGORISPOT_ID',$kategorispot_id);
		$this->db->update('kategorispot',$updated_kategorispot);
	}
	//End of Update Data Kategori Spot ------------------------------------------------------------
	
	//Begin of Delete Data Kategori Spot ------------------------------------------------------------
	function delete_kategorispot_by_id($kategorispot_id){
		$this->db->where('KATEGORISPOT_ID',$kategorispot_id);
		$this->db->delete('kategorispot');
	}
	//End of Delete Data Kategori Spot ------------------------------------------------------------
	
}

?>