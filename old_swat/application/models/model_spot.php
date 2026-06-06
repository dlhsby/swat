<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_spot extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data SPOT ------------------------------------------------------------
	function get_all_spot(){
		$this->db->from('spot');
		$this->db->order_by('SPOT_NAMA');
		return $this->db->get();
	}
	
	function get_all_spot_by_filter($namaSpot,$kategoriSpot){
		$this->db->from('spot');
		if($kategoriSpot){
			$this->db->where('KATEGORISPOT_ID ',$kategoriSpot);
		}
		if($namaSpot){
			$this->db->like('SPOT_NAMA',$namaSpot);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_spot($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM spot 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_all_paging_sorting_spot_by_filter($namaSpot,$kategoriSpot,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('spot');
		if($kategoriSpot){
			$this->db->where('KATEGORISPOT_ID ',$kategoriSpot);
		}
		if($namaSpot){
			$this->db->like('SPOT_NAMA',$namaSpot);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_spot_by_id($spot_id){
		$this->db->where('SPOT_ID',$spot_id);
		return $this->db->get('spot');
	}
	
	function get_all_spot_with_spot_kategori(){
		$this->db->from('spot');
		$this->db->join('kategorispot','spot.KATEGORISPOT_ID= kategorispot.KATEGORISPOT_ID');
		return $this->db->get();
	}
	
	function get_spot_by_id_with_spot_kategori($spot_id){
		$this->db->where('SPOT_ID',$spot_id);
		$this->db->from('spot');
		$this->db->join('kategorispot','spot.KATEGORISPOT_ID= kategorispot.KATEGORISPOT_ID');
		return $this->db->get();
	}
	
	function get_spot_by_kategorispot($kategoriSpot){
		$this->db->where('KATEGORISPOT_ID',$kategoriSpot);
		$this->db->order_by('SPOT_NAMA');
		return $this->db->get('spot');
	}
	
	function get_spot_by_kategorispot_is_kandang(){
		$this->db->where('KATEGORISPOT_ID','1');
		return $this->db->get('spot');
	}
	
	function get_spot_by_kategorispot_and_nama($kategoriSpot,$namaSpot){
		$this->db->from('spot');
		$this->db->where('KATEGORISPOT_ID',$kategoriSpot);
		$this->db->like('SPOT_NAMA',$namaSpot);
		$this->db->order_by('SPOT_NAMA');
		return $this->db->get();
	}
	
	function get_spot_pembuangan_by_kategorispot_and_nama($kategoriSpot,$namaSpot){
		$this->db->from('spot');
		$this->db->where('KATEGORISPOT_ID',$kategoriSpot);
		$this->db->where('SPOT_NAMA',$namaSpot);
		$this->db->order_by('SPOT_NAMA');
		return $this->db->get();
	}

	function get_last_inserted_spot(){
		return $this->db->query("
			SELECT * FROM spot 
			WHERE spot.SPOT_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data SPOT------------------------------------------------------------
	
	//Begin of Insert Data SPOT ------------------------------------------------------------
	function insert_spot($new_spot){
		$this->db->insert('spot',$new_spot);
	}
	//End of Insert Data SPOT  ------------------------------------------------------------
	
	//Begin of Update Data SPOT ------------------------------------------------------------
	function update_spot_by_id($spot_id,$updated_spot){
		$this->db->where('SPOT_ID',$spot_id);
		$this->db->update('spot',$updated_spot);
	}
	//End of Update Data SPOT ------------------------------------------------------------
	
	//Begin of Delete Data SPOT ------------------------------------------------------------
	function delete_spot_by_id($spot_id){
		$this->db->where('SPOT_ID',$spot_id);
		$this->db->delete('spot');
	}
	//End of Delete Data SPOT ------------------------------------------------------------
	
}

?>