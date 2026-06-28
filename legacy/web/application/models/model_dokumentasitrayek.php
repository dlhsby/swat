<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_dokumentasitrayek extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Dokumentasi Trayek ------------------------------------------------------------
	function get_all_dokumentasitrayek(){
		$this->db->from('dokumentasitrayek');
		return $this->db->get();
	}
	
	function get_dokumentasitrayek_by_id($dokumentasitrayek_id){
		$this->db->where('DOKUMENTASITRAYEK_ID',$dokumentasitrayek_id);
		return $this->db->get('dokumentasitrayek');
	}
	
	function get_dokumentasitrayek_by_trayek_id($trayek_id){
		$this->db->where('TRAYEK_ID',$trayek_id);
		return $this->db->get('dokumentasitrayek');
	}
	
	function get_last_inserted_dokumentasitrayek(){
		return $this->db->query("
			SELECT * FROM dokumentasitrayek 
			WHERE dokumentasitrayek.DOKUMENTASITRAYEK_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Dokumentasi Trayek------------------------------------------------------------
	
	//Begin of Insert Data Dokumentasi Trayek ------------------------------------------------------------
	function insert_dokumentasitrayek($new_dokumentasitrayek){
		$this->db->insert('dokumentasitrayek',$new_dokumentasitrayek);
	}
	//End of Insert Data Dokumentasi Trayek  ------------------------------------------------------------
	
	//Begin of Update Data Dokumentasi Trayek ------------------------------------------------------------
	function update_dokumentasitrayek_by_id($dokumentasitrayek_id,$updated_dokumentasitrayek){
		$this->db->where('DOKUMENTASITRAYEK_ID',$dokumentasitrayek_id);
		$this->db->update('dokumentasitrayek',$updated_dokumentasitrayek);
	}
	//End of Update Data Dokumentasi Trayek ------------------------------------------------------------
	
	//Begin of Delete Data Dokumentasi Trayek ------------------------------------------------------------
	function delete_dokumentasitrayek_by_id($dokumentasitrayek_id){
		$this->db->where('DOKUMENTASITRAYEK_ID',$dokumentasitrayek_id);
		$this->db->delete('dokumentasitrayek');
	}
	//End of Delete Data Dokumentasi Trayek ------------------------------------------------------------
	
}

?>