<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statusriwayatperawatan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Riwayat Perawatan ------------------------------------------------------------
	function get_all_statusriwayatperawatan(){
		$this->db->from('statusriwayatperawatan');
		return $this->db->get();
	}
	
	function get_statusriwayatperawatan_by_id($statusriwayatperawatan_id){
		$this->db->where('STATUSRIWAYATPERAWATAN_ID',$statusriwayatperawatan_id);
		return $this->db->get('statusriwayatperawatan');
	}
	//End of Get Data Status Riwayat Perawatan------------------------------------------------------------
	
	//Begin of Insert Data Status Riwayat Perawatan ------------------------------------------------------------
	function insert_statusriwayatperawatan($new_statusriwayatperawatan){
		$this->db->insert('statusriwayatperawatan',$new_statusriwayatperawatan);
	}
	//End of Insert Data Status Riwayat Perawatan  ------------------------------------------------------------
	
	//Begin of Update Data Status Riwayat Perawatan ------------------------------------------------------------
	function update_statusriwayatperawatan_by_id($statusriwayatperawatan_id,$updated_statusriwayatperawatan){
		$this->db->where('STATUSRIWAYATPERAWATAN_ID',$statusriwayatperawatan_id);
		$this->db->update('statusriwayatperawatan',$updated_statusriwayatperawatan);
	}
	//End of Update Data Status Riwayat Perawatan ------------------------------------------------------------
	
	//Begin of Delete Data Status Riwayat Perawatan ------------------------------------------------------------
	function delete_statusriwayatperawatan_by_id($statusriwayatperawatan_id){
		$this->db->where('STATUSRIWAYATPERAWATAN_ID',$statusriwayatperawatan_id);
		$this->db->delete('statusriwayatperawatan');
	}
	//End of Delete Data Status Riwayat Perawatan ------------------------------------------------------------
	
}

?>