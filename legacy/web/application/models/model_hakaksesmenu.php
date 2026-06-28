<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_hakaksesmenu extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Hak Akses Menu ------------------------------------------------------------
	function get_all_hakaksesmenu(){
		$this->db->from('hakaksesmenu');
		return $this->db->get();
	}
	
	function get_hakaksesmenu_by_id($hakaksesmenu_id){
		$this->db->where('HAKAKSESMENU_ID',$hakaksesmenu_id);
		return $this->db->get('hakaksesmenu');
	}
	
	function get_hakaksesmenu_by_hakakses_and_menu($hakakses_id,$menu_id){
		$this->db->where('HAKAKSES_ID',$hakakses_id);
		$this->db->where('MENU_ID',$menu_id);
		return $this->db->get('hakaksesmenu');
	}
	
	function get_all_hakaksesmenu_with_menu_and_hakakses(){		
		$this->db->from('hakaksesmenu');
		$this->db->join('menu','menu.MENU_ID = hakaksesmenu.MENU_ID');
		$this->db->join('hakakses','hakakses.HAKAKSES_ID = hakaksesmenu.HAKAKSES_ID');
		$this->db->order_by('hakakses.HAKAKSES_ID');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_hakaksesmenu($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM hakaksesmenu 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_last_inserted_hakaksesmenu(){
		return $this->db->query("
			SELECT * FROM hakaksesmenu 
			WHERE hakaksesmenu.HAKAKSESMENU_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Hak Akses Menu------------------------------------------------------------
	
	//Begin of Insert Data Hak Akses Menu ------------------------------------------------------------
	function insert_hakaksesmenu($new_hakaksesmenu){
		$this->db->insert('hakaksesmenu',$new_hakaksesmenu);
	}
	//End of Insert Data Hak Akses Menu  ------------------------------------------------------------
	
	//Begin of Update Data Hak Akses Menu ------------------------------------------------------------
	function update_hakaksesmenu_by_id($hakaksesmenu_id,$updated_hakaksesmenu){
		$this->db->where('HAKAKSESMENU_ID',$hakaksesmenu_id);
		$this->db->update('hakaksesmenu',$updated_hakaksesmenu);
	}
	//End of Update Data Hak Akses Menu ------------------------------------------------------------
	
	//Begin of Delete Data Hak Akses Menu ------------------------------------------------------------
	function delete_hakaksesmenu_by_id($hakaksesmenu_id){
		$this->db->where('HAKAKSESMENU_ID',$hakaksesmenu_id);
		$this->db->delete('hakaksesmenu');
	}
	//End of Delete Data Hak Akses Menu ------------------------------------------------------------
	
}

?>