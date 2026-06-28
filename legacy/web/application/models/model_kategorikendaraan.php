<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kategorikendaraan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kategori Kendaraan ------------------------------------------------------------
	function get_all_kategorikendaraan(){
		$this->db->from('kategorikendaraan');
		$this->db->order_by('KATEGORIKENDARAAN_MERK');
		return $this->db->get();
	}
	
	function get_all_paging_sorting_kategorikendaraan($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM kategorikendaraan 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_last_inserted_kategorikendaraan(){
		return $this->db->query("
			SELECT * FROM kategorikendaraan 
			WHERE kategorikendaraan.KATEGORIKENDARAAN_ID = LAST_INSERT_ID();
		");
	}
	
	function get_kategorikendaraan_by_id($kategorikendaraan_id){
		$this->db->where('KATEGORIKENDARAAN_ID',$kategorikendaraan_id);
		return $this->db->get('kategorikendaraan');
	}
	
	function get_kategorikendaraan_by_aplikasi_id($aplikasiKendaraanID){
		$this->db->from('kategorikendaraan');
		$this->db->where('APLIKASIKENDARAAN_ID',$aplikasiKendaraanID);
		return $this->db->get();
	}
	
	function get_kategorikendaraan_by_aplikasi_nama($aplikasiKendaraanNama){
		$this->db->from('kategorikendaraan');
		$this->db->join('aplikasikendaraan','kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->where('APLIKASIKENDARAAN_NAMA',$aplikasiKendaraanNama);
		return $this->db->get();
	}
	
	function get_all_kategorikendaraan_with_aplikasikendaraan_and_bahanbakar(){		
		$this->db->from('kategorikendaraan');
		$this->db->join('aplikasikendaraan','aplikasikendaraan.APLIKASIKENDARAAN_ID = kategorikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('bahanbakar','bahanbakar.BAHANBAKAR_ID = kategorikendaraan.BAHANBAKAR_ID');
		return $this->db->get();
	}
	
	function get_kategorikendaraan_with_aplikasikendaraan_and_bahanbakar_by_id($kategorikendaraan_id){		
		$this->db->from('kategorikendaraan');
		$this->db->where('KATEGORIKENDARAAN_ID',$kategorikendaraan_id);
		$this->db->join('aplikasikendaraan','aplikasikendaraan.APLIKASIKENDARAAN_ID = kategorikendaraan.APLIKASIKENDARAAN_ID');
		$this->db->join('bahanbakar','bahanbakar.BAHANBAKAR_ID = kategorikendaraan.BAHANBAKAR_ID');		
		return $this->db->get();
	}
	
	//End of Get Data Kategori Kendaraan------------------------------------------------------------
	
	//Begin of Insert Data Kategori Kendaraan ------------------------------------------------------------
	function insert_kategorikendaraan($new_kategorikendaraan){
		$this->db->insert('kategorikendaraan',$new_kategorikendaraan);
	}
	//End of Insert Data Kategori Kendaraan  ------------------------------------------------------------
	
	//Begin of Update Data Kategori Kendaraan ------------------------------------------------------------
	function update_kategorikendaraan_by_id($kategorikendaraan_id,$updated_kategorikendaraan){
		$this->db->where('KATEGORIKENDARAAN_ID',$kategorikendaraan_id);
		$this->db->update('kategorikendaraan',$updated_kategorikendaraan);
	}
	//End of Update Data Kategori Kendaraan ------------------------------------------------------------
	
	//Begin of Delete Data Kategori Kendaraan ------------------------------------------------------------
	function delete_kategorikendaraan_by_id($kategorikendaraan_id){
		$this->db->where('KATEGORIKENDARAAN_ID',$kategorikendaraan_id);
		$this->db->delete('kategorikendaraan');
	}
	//End of Delete Data Kategori Kendaraan ------------------------------------------------------------
	
}

?>