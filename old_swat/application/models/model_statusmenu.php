<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statusmenu extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Menu ------------------------------------------------------------
	function get_all_statusmenu(){
		$this->db->from('statusmenu');
		return $this->db->get();
	}
	
	function get_statusmenu_by_id($statusmenu_id){
		$this->db->where('STATUSMENU_ID',$statusmenu_id);
		return $this->db->get('statusmenu');
	}
	//End of Get Data Status Menu------------------------------------------------------------
	
	//Begin of Insert Data Status Menu ------------------------------------------------------------
	function insert_statusmenu($new_statusmenu){
		$this->db->insert('statusmenu',$new_statusmenu);
	}
	//End of Insert Data Status Menu  ------------------------------------------------------------
	
	//Begin of Update Data Status Menu ------------------------------------------------------------
	function update_statusmenu_by_id($statusmenu_id,$updated_statusmenu){
		$this->db->where('STATUSMENU_ID',$statusmenu_id);
		$this->db->update('statusmenu',$updated_statusmenu);
	}
	//End of Update Data Status Menu ------------------------------------------------------------
	
	//Begin of Delete Data Status Menu ------------------------------------------------------------
	function delete_statusmenu_by_id($statusmenu_id){
		$this->db->where('STATUSMENU_ID',$statusmenu_id);
		$this->db->delete('statusmenu');
	}
	//End of Delete Data Status Menu ------------------------------------------------------------
	
}

?>