<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_riwayatperawatan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Riwayat Perawatan ------------------------------------------------------------
	function get_all_riwayatperawatan(){
		$this->db->from('riwayatperawatan');
		return $this->db->get();
	}
	
	function get_riwayatperawatan_by_id($riwayatperawatan_id){
		$this->db->where('RIWAYATPERAWATAN_ID',$riwayatperawatan_id);
		return $this->db->get('riwayatperawatan');
	}
	
	function get_all_riwayatperawatan_with_statusriwayatperawatan_and_kendaraan(){		
		$this->db->from('riwayatperawatan');
		$this->db->join('statusriwayatperawatan','statusriwayatperawatan.STATUSRIWAYATPERAWATAN_ID = riwayatperawatan.STATUSRIWAYATPERAWATAN_ID');
		$this->db->join('kendaraan','kendaraan.KENDARAAN_ID= riwayatperawatan.KENDARAAN_ID');
		return $this->db->get();
	}
	//End of Get Data Riwayat Perawatan------------------------------------------------------------
	
	//Begin of Insert Data Riwayat Perawatan ------------------------------------------------------------
	function insert_riwayatperawatan($new_riwayatperawatan){
		$this->db->insert('riwayatperawatan',$new_riwayatperawatan);
	}
	//End of Insert Data Riwayat Perawatan  ------------------------------------------------------------
	
	//Begin of Update Data Riwayat Perawatan ------------------------------------------------------------
	function update_riwayatperawatan_by_id($riwayatperawatan_id,$updated_riwayatperawatan){
		$this->db->where('RIWAYATPERAWATAN_ID',$riwayatperawatan_id);
		$this->db->update('riwayatperawatan',$updated_riwayatperawatan);
	}
	//End of Update Data Riwayat Perawatan ------------------------------------------------------------
	
	//Begin of Delete Data Riwayat Perawatan ------------------------------------------------------------
	function delete_riwayatperawatan_by_id($riwayatperawatan_id){
		$this->db->where('RIWAYATPERAWATAN_ID',$riwayatperawatan_id);
		$this->db->delete('riwayatperawatan');
	}
	//End of Delete Data Riwayat Perawatan ------------------------------------------------------------
	
}

?>