<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_sim extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data SIM ------------------------------------------------------------
	function get_all_sim(){
		$this->db->from('sim');
		return $this->db->get();
	}
	
	function get_sim_by_id($sim_id){
		$this->db->where('SIM_ID',$sim_id);
		return $this->db->get('sim');
	}
	//End of Get Data SIM------------------------------------------------------------
	
	//Begin of Insert Data SIM ------------------------------------------------------------
	function insert_sim($new_sim){
		$this->db->insert('sim',$new_sim);
	}
	//End of Insert Data SIM  ------------------------------------------------------------
	
	//Begin of Update Data SIM ------------------------------------------------------------
	function update_sim_by_id($sim_id,$updated_sim){
		$this->db->where('SIM_ID',$sim_id);
		$this->db->update('sim',$updated_sim);
	}
	//End of Update Data SIM ------------------------------------------------------------
	
	//Begin of Delete Data SIM ------------------------------------------------------------
	function delete_sim_by_id($sim_id){
		$this->db->where('SIM_ID',$sim_id);
		$this->db->delete('sim');
	}
	//End of Delete Data SIM ------------------------------------------------------------
	
}

?>