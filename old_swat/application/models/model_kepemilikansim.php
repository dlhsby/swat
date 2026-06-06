<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kepemilikansim extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kepemilikan Sim ------------------------------------------------------------
	function get_all_kepemilikansim(){
		$this->db->from('kepemilikansim');
		return $this->db->get();
	}
	
	function get_kepemilikansim_by_id($kepemilikansim_id){
		$this->db->where('KEPEMILIKANSIM_ID',$kepemilikansim_id);
		return $this->db->get('kepemilikansim');
	}
	
	function get_all_kepemilikansim_with_pengemudi_and_sim(){		
		$this->db->from('kepemilikansim');
		$this->db->join('pengemudi','pengemudi.PENGEMUDI_ID = kepemilikansim.PENGEMUDI_ID');
		$this->db->join('sim','sim.SIM_ID = kepemilikansim.SIM_ID');
		$this->db->order_by('pengemudi.PENGEMUDI_ID');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_kepemilikansim($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM kepemilikansim 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_last_inserted_kepemilikansim(){
		return $this->db->query("
			SELECT * FROM kepemilikansim 
			WHERE kepemilikansim.KEPEMILIKANSIM_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Kepemilikan Sim------------------------------------------------------------
	
	//Begin of Insert Data Kepemilikan Sim ------------------------------------------------------------
	function insert_kepemilikansim($new_kepemilikansim){
		$this->db->insert('kepemilikansim',$new_kepemilikansim);
	}
	//End of Insert Data Kepemilikan Sim  ------------------------------------------------------------
	
	//Begin of Update Data Kepemilikan Sim ------------------------------------------------------------
	function update_kepemilikansim_by_id($kepemilikansim_id,$updated_kepemilikansim){
		$this->db->where('KEPEMILIKANSIM_ID',$kepemilikansim_id);
		$this->db->update('kepemilikansim',$updated_kepemilikansim);
	}
	//End of Update Data Kepemilikan Sim ------------------------------------------------------------
	
	//Begin of Delete Data Kepemilikan Sim ------------------------------------------------------------
	function delete_kepemilikansim_by_id($kepemilikansim_id){
		$this->db->where('KEPEMILIKANSIM_ID',$kepemilikansim_id);
		$this->db->delete('kepemilikansim');
	}
	//End of Delete Data Kepemilikan Sim ------------------------------------------------------------
	
}

?>