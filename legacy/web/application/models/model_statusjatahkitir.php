<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statusjatahkitir extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Jatah Kitir ------------------------------------------------------------
	function get_all_statusjatahkitir(){
		$this->db->from('statusjatahkitir');
		return $this->db->get();
	}
	
	function get_statusjatahkitir_by_id($statusjatahkitir_id){
		$this->db->where('STATUSJATAHKITIR_ID',$statusjatahkitir_id);
		return $this->db->get('statusjatahkitir');
	}
	//End of Get Data Status Jatah Kitir------------------------------------------------------------
	
	//Begin of Insert Data Status Jatah Kitir ------------------------------------------------------------
	function insert_statusjatahkitir($new_statusjatahkitir){
		$this->db->insert('statusjatahkitir',$new_statusjatahkitir);
	}
	//End of Insert Data Status Jatah Kitir  ------------------------------------------------------------
	
	//Begin of Update Data Status Jatah Kitir ------------------------------------------------------------
	function update_statusjatahkitir_by_id($statusjatahkitir_id,$updated_statusjatahkitir){
		$this->db->where('STATUSJATAHKITIR_ID',$statusjatahkitir_id);
		$this->db->update('statusjatahkitir',$updated_statusjatahkitir);
	}
	//End of Update Data Status Jatah Kitir ------------------------------------------------------------
	
	//Begin of Delete Data Status Jatah Kitir ------------------------------------------------------------
	function delete_statusjatahkitir_by_id($statusjatahkitir_id){
		$this->db->where('STATUSJATAHKITIR_ID',$statusjatahkitir_id);
		$this->db->delete('statusjatahkitir');
	}
	//End of Delete Data Status Jatah Kitir ------------------------------------------------------------
	
}

?>