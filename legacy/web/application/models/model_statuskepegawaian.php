<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statuskepegawaian extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Kepegawaian ------------------------------------------------------------
	function get_all_statuskepegawaian(){
		$this->db->from('statuskepegawaian');
		return $this->db->get();
	}
	
	function get_statuskepegawaian_by_id($statuskepegawaian_id){
		$this->db->where('STATUSKEPEGAWAIAN_ID',$statuskepegawaian_id);
		return $this->db->get('statuskepegawaian');
	}
	//End of Get Data Status Kepegawaian------------------------------------------------------------
	
	//Begin of Insert Data Status Kepegawaian ------------------------------------------------------------
	function insert_statuskepegawaian($new_statuskepegawaian){
		$this->db->insert('statuskepegawaian',$new_statuskepegawaian);
	}
	//End of Insert Data Status Kepegawaian  ------------------------------------------------------------
	
	//Begin of Update Data Status Kepegawaian ------------------------------------------------------------
	function update_statuskepegawaian_by_id($statuskepegawaian_id,$updated_statuskepegawaian){
		$this->db->where('STATUSKEPEGAWAIAN_ID',$statuskepegawaian_id);
		$this->db->update('statuskepegawaian',$updated_statuskepegawaian);
	}
	//End of Update Data Status Kepegawaian ------------------------------------------------------------
	
	//Begin of Delete Data Status Kepegawaian ------------------------------------------------------------
	function delete_statuskepegawaian_by_id($statuskepegawaian_id){
		$this->db->where('STATUSKEPEGAWAIAN_ID',$statuskepegawaian_id);
		$this->db->delete('statuskepegawaian');
	}
	//End of Delete Data Status Kepegawaian ------------------------------------------------------------
	
}

?>