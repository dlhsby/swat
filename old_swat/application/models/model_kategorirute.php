<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kategorirute extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kategori Rute ------------------------------------------------------------
	function get_all_kategorirute(){
		$this->db->from('kategorirute');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_kategorirute($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM kategorirute 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_kategorirute_by_id($kategorirute_id){
		$this->db->where('KATEGORIRUTE_ID',$kategorirute_id);
		return $this->db->get('kategorirute');
	}
	
	function get_last_inserted_kategorirute(){
		return $this->db->query("
			SELECT * FROM kategorirute 
			WHERE kategorirute.KATEGORIRUTE_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Kategori Rute------------------------------------------------------------
	
	//Begin of Insert Data Kategori Rute ------------------------------------------------------------
	function insert_kategorirute($new_kategorirute){
		$this->db->insert('kategorirute',$new_kategorirute);
	}
	//End of Insert Data Kategori Rute  ------------------------------------------------------------
	
	//Begin of Update Data Kategori Rute ------------------------------------------------------------
	function update_kategorirute_by_id($kategorirute_id,$updated_kategorirute){
		$this->db->where('KATEGORIRUTE_ID',$kategorirute_id);
		$this->db->update('kategorirute',$updated_kategorirute);
	}
	//End of Update Data Kategori Rute ------------------------------------------------------------
	
	//Begin of Delete Data Kategori Rute ------------------------------------------------------------
	function delete_kategorirute_by_id($kategorirute_id){
		$this->db->where('KATEGORIRUTE_ID',$kategorirute_id);
		$this->db->delete('kategorirute');
	}
	//End of Delete Data Kategori Rute ------------------------------------------------------------
	
}

?>