<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_hakakses extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Hak Akses ------------------------------------------------------------
	function get_all_hakakses(){
		$this->db->from('hakakses');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_hakakses($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM hakakses 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_hakakses_by_id($hakakses_id){
		$this->db->where('HAKAKSES_ID',$hakakses_id);
		return $this->db->get('hakakses');
	}
	
	function get_hakAksesForMenu($menuID,$hakAksesID){
		$this->db->from('hakaksesmenu');
		$this->db->where('hakaksesmenu.MENU_ID',$menuID);
		$this->db->where('hakaksesmenu.HAKAKSES_ID',$hakAksesID);
		$data = $this->db->get();
		if($data->num_rows() > 0){
			return TRUE;
		}
		else return FALSE;
	}
	
	function get_last_inserted_hakakses(){
		return $this->db->query("
			SELECT * FROM hakakses 
			WHERE hakakses.HAKAKSES_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Hak Akses------------------------------------------------------------
	
	//Begin of Insert Data Hak Akses ------------------------------------------------------------
	function insert_hakakses($new_hakakses){
		$this->db->insert('hakakses',$new_hakakses);
	}
	//End of Insert Data Hak Akses  ------------------------------------------------------------
	
	//Begin of Update Data Hak Akses ------------------------------------------------------------
	function update_hakakses_by_id($hakakses_id,$updated_hakakses){
		$this->db->where('HAKAKSES_ID',$hakakses_id);
		$this->db->update('hakakses',$updated_hakakses);
	}
	//End of Update Data Hak Akses ------------------------------------------------------------
	
	//Begin of Delete Data Hak Akses ------------------------------------------------------------
	function delete_hakakses_by_id($hakakses_id){
		$this->db->where('HAKAKSES_ID',$hakakses_id);
		$this->db->delete('hakakses');
	}
	//End of Delete Data Hak Akses ------------------------------------------------------------
	
}

?>