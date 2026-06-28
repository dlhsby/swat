<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_bahanbakar extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Bahan Bakar ------------------------------------------------------------
	function get_all_bahanbakar(){
		$this->db->from('bahanbakar');
		return $this->db->get();
	}
	
	function get_bahanbakar_by_id($bahanbakar_id){
		$this->db->where('BAHANBAKAR_ID',$bahanbakar_id);
		return $this->db->get('bahanbakar');
	}
	
	function get_all_bahanbakar_with_kategoribahanbakar(){		
		$this->db->from('bahanbakar');
		$this->db->join('kategoribahanbakar','kategoribahanbakar.KATEGORIBAHANBAKAR_ID = bahanbakar.KATEGORIBAHANBAKAR_ID');
		return $this->db->get();
	}
	
	//End of Get Data Bahan Bakar------------------------------------------------------------
	
	//Begin of Insert Data Bahan Bakar ------------------------------------------------------------
	function insert_bahanbakar($new_bahanbakar){
		$this->db->insert('bahanbakar',$new_bahanbakar);
	}
	//End of Insert Data Bahan Bakar  ------------------------------------------------------------
	
	//Begin of Update Data Bahan Bakar ------------------------------------------------------------
	function update_bahanbakar_by_id($bahanbakar_id,$updated_bahanbakar){
		$this->db->where('BAHANBAKAR_ID',$bahanbakar_id);
		$this->db->update('bahanbakar',$updated_bahanbakar);
	}
	//End of Update Data Bahan Bakar ------------------------------------------------------------
	
	//Begin of Delete Data Bahan Bakar ------------------------------------------------------------
	function delete_bahanbakar_by_id($bahanbakar_id){
		$this->db->where('BAHANBAKAR_ID',$bahanbakar_id);
		$this->db->delete('bahanbakar');
	}
	//End of Delete Data Bahan Bakar ------------------------------------------------------------
	
}

?>