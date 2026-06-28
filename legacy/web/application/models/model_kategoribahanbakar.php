<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kategoribahanbakar extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kategori Bahan Bakar ------------------------------------------------------------
	function get_all_kategoribahanbakar(){
		$this->db->from('kategoribahanbakar');
		return $this->db->get();
	}
	
	function get_kategoribahanbakar_by_id($kategoribahanbakar_id){
		$this->db->where('KATEGORIBAHANBAKAR_ID',$kategoribahanbakar_id);
		return $this->db->get('kategoribahanbakar');
	}
	//End of Get Data Kategori Bahan Bakar------------------------------------------------------------
	
	//Begin of Insert Data Kategori Bahan Bakar ------------------------------------------------------------
	function insert_kategoribahanbakar($new_kategoribahanbakar){
		$this->db->insert('kategoribahanbakar',$new_kategoribahanbakar);
	}
	//End of Insert Data Kategori Bahan Bakar  ------------------------------------------------------------
	
	//Begin of Update Data Kategori Bahan Bakar ------------------------------------------------------------
	function update_kategoribahanbakar_by_id($kategoribahanbakar_id,$updated_kategoribahanbakar){
		$this->db->where('KATEGORIBAHANBAKAR_ID',$kategoribahanbakar_id);
		$this->db->update('kategoribahanbakar',$updated_kategoribahanbakar);
	}
	//End of Update Data Kategori Bahan Bakar ------------------------------------------------------------
	
	//Begin of Delete Data Kategori Bahan Bakar ------------------------------------------------------------
	function delete_kategoribahanbakar_by_id($kategoribahanbakar_id){
		$this->db->where('KATEGORIBAHANBAKAR_ID',$kategoribahanbakar_id);
		$this->db->delete('kategoribahanbakar');
	}
	//End of Delete Data Kategori Bahan Bakar ------------------------------------------------------------
	
}

?>