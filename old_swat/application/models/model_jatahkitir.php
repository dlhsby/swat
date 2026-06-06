<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_jatahkitir extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Jatah Kitir ------------------------------------------------------------
	function get_all_jatahkitir(){
		$this->db->from('jatahkitir');
		return $this->db->get();
	}
	
	function get_all_jatahkitir_by_filter($idJatahKitir,$tanggalDiterbitkan,$nopolKendaraan,$tps,$statusJatahKitir){
		$this->db->from('jatahkitir');
		$this->db->join('kendaraan','jatahkitir.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('spot','jatahkitir.SPOT_ID = spot.SPOT_ID');
		$this->db->join('statusjatahkitir','jatahkitir.STATUSJATAHKITIR_ID = statusjatahkitir.STATUSJATAHKITIR_ID');
		if($idJatahKitir){
			$this->db->where('jatahkitir.JATAHKITIR_ID',$idJatahKitir);
		}
		if($tanggalDiterbitkan){
			$this->db->like('jatahkitir.JATAHKITIR_WAKTUDITERBITKAN',$tanggalDiterbitkan);
		}
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($tps){
			$this->db->where('spot.SPOT_ID',$tps);
		}
		if($statusJatahKitir){
			$this->db->where('statusjatahkitir.STATUSJATAHKITIR_ID',$statusJatahKitir);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_jatahkitir_by_filter($idJatahKitir,$tanggalDiterbitkan,$nopolKendaraan,$tps,$statusJatahKitir,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('jatahkitir');
		$this->db->join('kendaraan','jatahkitir.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('spot','jatahkitir.SPOT_ID = spot.SPOT_ID');
		$this->db->join('statusjatahkitir','jatahkitir.STATUSJATAHKITIR_ID = statusjatahkitir.STATUSJATAHKITIR_ID');
		if($idJatahKitir){
			$this->db->where('jatahkitir.JATAHKITIR_ID',$idJatahKitir);
		}
		if($tanggalDiterbitkan){
			$this->db->like('jatahkitir.JATAHKITIR_WAKTUDITERBITKAN',$tanggalDiterbitkan);
		}
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($tps){
			$this->db->where('spot.SPOT_ID',$tps);
		}
		if($statusJatahKitir){
			$this->db->where('statusjatahkitir.STATUSJATAHKITIR_ID',$statusJatahKitir);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_jatahkitir_by_id($jatahkitir_id){
		$this->db->where('JATAHKITIR_ID',$jatahkitir_id);
		return $this->db->get('jatahkitir');
	}
	
	function get_last_inserted_jatahkitir(){
		return $this->db->query("
			SELECT * FROM jatahkitir 
			WHERE jatahkitir.JATAHKITIR_ID= LAST_INSERT_ID();
		");
	}
	//End of Get Data Jatah Kitir------------------------------------------------------------
	
	//Begin of Insert Data Jatah Kitir ------------------------------------------------------------
	function insert_jatahkitir($new_jatahkitir){
		$this->db->insert('jatahkitir',$new_jatahkitir);
	}
	//End of Insert Data Jatah Kitir  ------------------------------------------------------------
	
	//Begin of Update Data Jatah Kitir ------------------------------------------------------------
	function update_jatahkitir_by_id($jatahkitir_id,$updated_jatahkitir){
		$this->db->where('JATAHKITIR_ID',$jatahkitir_id);
		$this->db->update('jatahkitir',$updated_jatahkitir);
	}
	//End of Update Data Jatah Kitir ------------------------------------------------------------
	
	//Begin of Delete Data Jatah Kitir ------------------------------------------------------------
	function delete_jatahkitir_by_id($jatahkitir_id){
		$this->db->where('JATAHKITIR_ID',$jatahkitir_id);
		$this->db->delete('jatahkitir');
	}
	//End of Delete Data Jatah Kitir ------------------------------------------------------------
	
}

?>