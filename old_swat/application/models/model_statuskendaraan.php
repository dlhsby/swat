<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statuskendaraan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Kendaraan ------------------------------------------------------------
	function get_all_statuskendaraan(){
		$this->db->from('statuskendaraan');
		$this->db->order_by('STATUSKENDARAAN_NAMA');
		return $this->db->get();
	}
	
	function get_statuskendaraan_by_id($statuskendaraan_id){
		$this->db->where('STATUSKENDARAAN_ID',$statuskendaraan_id);
		return $this->db->get('statuskendaraan');
	}
	//End of Get Data Status Kendaraan------------------------------------------------------------
	
	//Begin of Insert Data Status Kendaraan ------------------------------------------------------------
	function insert_statuskendaraan($new_statuskendaraan){
		$this->db->insert('statuskendaraan',$new_statuskendaraan);
	}
	//End of Insert Data Status Kendaraan  ------------------------------------------------------------
	
	//Begin of Update Data Status Kendaraan ------------------------------------------------------------
	function update_statuskendaraan_by_id($statuskendaraan_id,$updated_statuskendaraan){
		$this->db->where('STATUSKENDARAAN_ID',$statuskendaraan_id);
		$this->db->update('statuskendaraan',$updated_statuskendaraan);
	}
	//End of Update Data Status Kendaraan ------------------------------------------------------------
	
	//Begin of Delete Data Status Kendaraan ------------------------------------------------------------
	function delete_statuskendaraan_by_id($statuskendaraan_id){
		$this->db->where('STATUSKENDARAAN_ID',$statuskendaraan_id);
		$this->db->delete('statuskendaraan');
	}
	//End of Delete Data Status Kendaraan ------------------------------------------------------------
	
}

?>