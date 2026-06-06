<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_kategorisumbersampahkendaraan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Kategori Sumber Sampah Kendaraan ------------------------------------------------------------
	function get_all_kategorisumbersampahkendaraan(){
		$this->db->from('kategorisumbersampahkendaraan');
		return $this->db->get();
	}
	
	function get_all_kategorisumbersampahkendaraan_by_filter($nopolKendaraan,$poolKendaraan,$kodeKendaraan){
		$this->db->from('kategorisumbersampahkendaraan');
		$this->db->join('kendaraan','kategorisumbersampahkendaraan.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		if($kodeKendaraan){
			$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kodeKendaraan);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_kategorisumbersampahkendaraan_by_filter($nopolKendaraan,$poolKendaraan,$kodeKendaraan,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('kategorisumbersampahkendaraan');
		$this->db->join('kendaraan','kategorisumbersampahkendaraan.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('kategorisumbersampah','kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID = kategorisumbersampah.KATEGORISUMBERSAMPAH_ID');
		$this->db->join('spot','spot.SPOT_ID = kendaraan.SPOT_POOL_ID');
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		if($kodeKendaraan){
			$this->db->where('kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAH_ID',$kodeKendaraan);
		}
		$this->db->limit($jtPageSize,$jtStartIndex);
		$this->db->order_by($jtSorting);
		return $this->db->get();
	}
	
	function get_last_inserted_kategorisumbersampahkendaraan(){
		return $this->db->query("
			SELECT * FROM kategorisumbersampahkendaraan 
			WHERE kategorisumbersampahkendaraan.KATEGORISUMBERSAMPAHKENDARAAN_ID = LAST_INSERT_ID();
		");
	}
	
	function get_kategorisumbersampahkendaraan_by_id($kategorisumbersampahkendaraan_id){
		$this->db->where('KATEGORISUMBERSAMPAHKENDARAAN_ID',$kategorisumbersampahkendaraan_id);
		return $this->db->get('kategorisumbersampahkendaraan');
	}
	
	function get_kategorisumbersampahkendaraan_by_kendaraan_id($kendaraan_id){
		$this->db->where('KENDARAAN_ID',$kendaraan_id);
		return $this->db->get('kategorisumbersampahkendaraan');
	}
	//End of Get Data Kategori Sumber Sampah Kendaraan------------------------------------------------------------
	
	//Begin of Insert Data Kategori Sumber Sampah Kendaraan ------------------------------------------------------------
	function insert_kategorisumbersampahkendaraan($new_kategorisumbersampahkendaraan){
		$this->db->insert('kategorisumbersampahkendaraan',$new_kategorisumbersampahkendaraan);
	}
	//End of Insert Data Kategori Sumber Sampah Kendaraan  ------------------------------------------------------------
	
	//Begin of Update Data Kategori Sumber Sampah Kendaraan ------------------------------------------------------------
	function update_kategorisumbersampahkendaraan_by_id($kategorisumbersampahkendaraan_id,$updated_kategorisumbersampahkendaraan){
		$this->db->where('KATEGORISUMBERSAMPAHKENDARAAN_ID',$kategorisumbersampahkendaraan_id);
		$this->db->update('kategorisumbersampahkendaraan',$updated_kategorisumbersampahkendaraan);
	}
	//End of Update Data Kategori Sumber Sampah Kendaraan ------------------------------------------------------------
	
	//Begin of Delete Data Kategori Sumber Sampah Kendaraan ------------------------------------------------------------
	function delete_kategorisumbersampahkendaraan_by_id($kategorisumbersampahkendaraan_id){
		$this->db->where('KATEGORISUMBERSAMPAHKENDARAAN_ID',$kategorisumbersampahkendaraan_id);
		$this->db->delete('kategorisumbersampahkendaraan');
	}
	//End of Delete Data Kategori Sumber Sampah Kendaraan ------------------------------------------------------------
	
}

?>