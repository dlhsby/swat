<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kategorisumbersampah extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kategori Sumber Sampah ------------------------------------------------------------
	function get_all_kategorisumbersampah(){
		$this->db->from('kategorisumbersampah');
		$this->db->order_by('KATEGORISUMBERSAMPAH_NAMA');
		return $this->db->get();
	}
	
	function get_last_inserted_kategorisumbersampah(){
		return $this->db->query("
			SELECT * FROM kategorisumbersampah 
			WHERE kategorisumbersampah.KATEGORISUMBERSAMPAH_ID = LAST_INSERT_ID();
		");
	}
	
	function get_all_paging_sorting_kategorisumbersampah($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM kategorisumbersampah 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_kategorisumbersampah_by_id($kategorisumbersampah_id){
		$this->db->where('KATEGORISUMBERSAMPAH_ID',$kategorisumbersampah_id);
		return $this->db->get('kategorisumbersampah');
	}
	
	//End of Get Data Kategori Sumber Sampah------------------------------------------------------------
	
	//Begin of Insert Data Kategori Sumber Sampah ------------------------------------------------------------
	function insert_kategorisumbersampah($new_kategorisumbersampah){
		$this->db->insert('kategorisumbersampah',$new_kategorisumbersampah);
	}
	//End of Insert Data Kategori Sumber Sampah  ------------------------------------------------------------
	
	//Begin of Update Data Kategori Sumber Sampah ------------------------------------------------------------
	function update_kategorisumbersampah_by_id($kategorisumbersampah_id,$updated_kategorisumbersampah){
		$this->db->where('KATEGORISUMBERSAMPAH_ID',$kategorisumbersampah_id);
		$this->db->update('kategorisumbersampah',$updated_kategorisumbersampah);
	}
	//End of Update Data Kategori Sumber Sampah ------------------------------------------------------------
	
	//Begin of Delete Data Kategori Sumber Sampah ------------------------------------------------------------
	function delete_kategorisumbersampah_by_id($kategorisumbersampah_id){
		$this->db->where('KATEGORISUMBERSAMPAH_ID',$kategorisumbersampah_id);
		$this->db->delete('kategorisumbersampah');
	}
	//End of Delete Data Kategori Sumber Sampah ------------------------------------------------------------
	
}

?>