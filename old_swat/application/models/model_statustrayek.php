<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statustrayek extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Trayek ------------------------------------------------------------
	function get_all_statustrayek(){
		$this->db->from('statustrayek');
		return $this->db->get();
	}
	
	function get_statustrayek_by_id($statustrayek_id){
		$this->db->where('STATUSTRAYEK_ID',$statustrayek_id);
		return $this->db->get('statustrayek');
	}
	//End of Get Data Status Trayek------------------------------------------------------------
	
	//Begin of Insert Data Status Trayek ------------------------------------------------------------
	function insert_statustrayek($new_statustrayek){
		$this->db->insert('statustrayek',$new_statustrayek);
	}
	//End of Insert Data Status Trayek  ------------------------------------------------------------
	
	//Begin of Update Data Status Trayek ------------------------------------------------------------
	function update_statustrayek_by_id($statustrayek_id,$updated_statustrayek){
		$this->db->where('STATUSTRAYEK_ID',$statustrayek_id);
		$this->db->update('statustrayek',$updated_statustrayek);
	}
	//End of Update Data Status Trayek ------------------------------------------------------------
	
	//Begin of Delete Data Status Trayek ------------------------------------------------------------
	function delete_statustrayek_by_id($statustrayek_id){
		$this->db->where('STATUSTRAYEK_ID',$statustrayek_id);
		$this->db->delete('statustrayek');
	}
	//End of Delete Data Status Trayek ------------------------------------------------------------
	
}

?>