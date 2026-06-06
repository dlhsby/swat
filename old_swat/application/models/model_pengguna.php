<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_pengguna extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		parent::__construct();
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Pengguna ------------------------------------------------------------
	function get_all_pengguna(){
		$this->db->from('pengguna');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_pengguna($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM pengguna 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_pengguna_by_id($pengguna_id){
		$this->db->where('PENGGUNA_ID',$pengguna_id);
		return $this->db->get('pengguna');
	}
	
	function get_validasipengguna_by_pengguna_username($pengguna_username){
		return $this->db->query("
			SELECT * FROM pengguna 
			WHERE pengguna.PENGGUNA_USERNAME = '".$pengguna_username."';
		");
	}
	
	function get_pengguna_by_pengguna_username_and_password($pengguna_username,$pengguna_password){
		return $this->db->query("
			SELECT * FROM pengguna 
			WHERE pengguna.PENGGUNA_USERNAME='".$pengguna_username."' AND pengguna.PENGGUNA_PASSWORD = MD5('".$pengguna_password."');
		");
	}
	
	function get_all_pengguna_with_hakakses(){		
		$this->db->from('pengguna');
		$this->db->join('hakakses','hakakses.HAKAKSES_ID = pengguna.HAKAKSES_ID');
		return $this->db->get();
	}
	
	function get_last_inserted_pengguna(){
		return $this->db->query("
			SELECT * FROM pengguna 
			WHERE pengguna.PENGGUNA_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Pengguna------------------------------------------------------------
	
	//Begin of Insert Data Pengguna------------------------------------------------------------
	function insert_pengguna($new_pengguna){
		$this->db->insert('pengguna',$new_pengguna);
	}
	//End of Insert Data Pengguna------------------------------------------------------------
	
	//Begin of Update Data Pengguna------------------------------------------------------------
	function update_pengguna_by_id($pengguna_id,$updated_pengguna){
		$this->db->where('PENGGUNA_ID',$pengguna_id);
		$this->db->update('pengguna',$updated_pengguna);
	}
	//End of Update Data Pengguna------------------------------------------------------------
	
	//Begin of Delete Data Pengguna------------------------------------------------------------
	function delete_pengguna_by_id($pengguna_id){
		$this->db->where('PENGGUNA_ID',$pengguna_id);
		$this->db->delete('pengguna');
	}
	//End of Delete Data Pengguna------------------------------------------------------------
	
}

?>