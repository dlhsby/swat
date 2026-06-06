<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_aplikasikendaraan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Aplikasi Kendaraan ------------------------------------------------------------
	function get_all_aplikasikendaraan(){
		$this->db->from('aplikasikendaraan');
		$this->db->order_by('APLIKASIKENDARAAN_NAMA');
		return $this->db->get();
	}
	
	function get_all_aplikasikendaraan_by_filter($namaAplikasi){
		$this->db->from('aplikasikendaraan');
		if($namaAplikasi){
			$this->db->like('APLIKASIKENDARAAN_NAMA',$namaAplikasi);
		}
		return $this->db->get();
	}
	
	function get_last_inserted_aplikasikendaraan(){
		return $this->db->query("
			SELECT * FROM aplikasikendaraan 
			WHERE aplikasikendaraan.APLIKASIKENDARAAN_ID = LAST_INSERT_ID();
		");
	}
	
	function get_all_paging_sorting_aplikasikendaraan($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM aplikasikendaraan 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_all_paging_sorting_aplikasikendaraan_by_filter($namaAplikasi,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('aplikasikendaraan');
		if($namaAplikasi){
			$this->db->like('APLIKASIKENDARAAN_NAMA',$namaAplikasi);
		}
		$this->db->limit($jtPageSize,$jtStartIndex);
		$this->db->order_by($jtSorting);
		return $this->db->get();
	}
	
	function get_aplikasikendaraan_by_id($aplikasikendaraan_id){
		$this->db->where('APLIKASIKENDARAAN_ID',$aplikasikendaraan_id);
		return $this->db->get('aplikasikendaraan');
	}
	
	//End of Get Data Aplikasi Kendaraan------------------------------------------------------------
	
	//Begin of Insert Data Aplikasi Kendaraan ------------------------------------------------------------
	function insert_aplikasikendaraan($new_aplikasikendaraan){
		$this->db->insert('aplikasikendaraan',$new_aplikasikendaraan);
	}
	//End of Insert Data Aplikasi Kendaraan  ------------------------------------------------------------
	
	//Begin of Update Data Aplikasi Kendaraan ------------------------------------------------------------
	function update_aplikasikendaraan_by_id($aplikasikendaraan_id,$updated_aplikasikendaraan){
		$this->db->where('APLIKASIKENDARAAN_ID',$aplikasikendaraan_id);
		$this->db->update('aplikasikendaraan',$updated_aplikasikendaraan);
	}
	//End of Update Data Aplikasi Kendaraan ------------------------------------------------------------
	
	//Begin of Delete Data Aplikasi Kendaraan ------------------------------------------------------------
	function delete_aplikasikendaraan_by_id($aplikasikendaraan_id){
		$this->db->where('APLIKASIKENDARAAN_ID',$aplikasikendaraan_id);
		$this->db->delete('aplikasikendaraan');
	}
	//End of Delete Data Aplikasi Kendaraan ------------------------------------------------------------
	
}

?>