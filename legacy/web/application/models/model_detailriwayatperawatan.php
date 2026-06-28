<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_detailriwayatperawatan extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Detail Riwayat Perawatan ------------------------------------------------------------
	function get_all_detailriwayatperawatan(){
		$this->db->from('detailriwayatperawatan');
		return $this->db->get();
	}
	
	function get_detailriwayatperawatan_by_id($detailriwayatperawatan_id){
		$this->db->where('DETAILRIWAYATPERAWATAN_ID',$detailriwayatperawatan_id);
		return $this->db->get('detailriwayatperawatan');
	}
	
	function get_detailriwayatperawatan_by_riwayatperawatan_id($riwayatperawatan_id){
		$this->db->where('RIWAYATPERAWATAN_ID',$riwayatperawatan_id);
		return $this->db->get('detailriwayatperawatan');
	}
	//End of Get Data Detail Riwayat Perawatan------------------------------------------------------------
	
	//Begin of Insert Data Detail Riwayat Perawatan ------------------------------------------------------------
	function insert_detailriwayatperawatan($new_detailriwayatperawatan){
		$this->db->insert('detailriwayatperawatan',$new_detailriwayatperawatan);
	}
	//End of Insert Data Detail Riwayat Perawatan  ------------------------------------------------------------
	
	//Begin of Update Data Detail Riwayat Perawatan ------------------------------------------------------------
	function update_detailriwayatperawatan_by_id($detailriwayatperawatan_id,$updated_detailriwayatperawatan){
		$this->db->where('DETAILRIWAYATPERAWATAN_ID',$detailriwayatperawatan_id);
		$this->db->update('detailriwayatperawatan',$updated_detailriwayatperawatan);
	}
	//End of Update Data Detail Riwayat Perawatan ------------------------------------------------------------
	
	//Begin of Delete Data Detail Riwayat Perawatan ------------------------------------------------------------
	function delete_detailriwayatperawatan_by_id($detailriwayatperawatan_id){
		$this->db->where('DETAILRIWAYATPERAWATAN_ID',$detailriwayatperawatan_id);
		$this->db->delete('detailriwayatperawatan');
	}
	//End of Delete Data Detail Riwayat Perawatan ------------------------------------------------------------
	
}

?>