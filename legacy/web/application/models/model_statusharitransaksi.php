<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statusharitransaksi extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Hari Transaksi ------------------------------------------------------------
	function get_all_statusharitransaksi(){
		$this->db->from('statusharitransaksi');
		return $this->db->get();
	}
	
	function get_statusharitransaksi_by_id($statusharitransaksi_id){
		$this->db->where('STATUSHARITRANSAKSI_ID',$statusharitransaksi_id);
		return $this->db->get('statusharitransaksi');
	}
	//End of Get Data Status Hari Transaksi------------------------------------------------------------
	
	//Begin of Insert Data Status Hari Transaksi ------------------------------------------------------------
	function insert_statusharitransaksi($new_statusharitransaksi){
		$this->db->insert('statusharitransaksi',$new_statusharitransaksi);
	}
	//End of Insert Data Status Hari Transaksi  ------------------------------------------------------------
	
	//Begin of Update Data Status Hari Transaksi ------------------------------------------------------------
	function update_statusharitransaksi_by_id($statusharitransaksi_id,$updated_statusharitransaksi){
		$this->db->where('STATUSHARITRANSAKSI_ID',$statusharitransaksi_id);
		$this->db->update('statusharitransaksi',$updated_statusharitransaksi);
	}
	//End of Update Data Status Hari Transaksi ------------------------------------------------------------
	
	//Begin of Delete Data Status Hari Transaksi ------------------------------------------------------------
	function delete_statusharitransaksi_by_id($statusharitransaksi_id){
		$this->db->where('STATUSHARITRANSAKSI_ID',$statusharitransaksi_id);
		$this->db->delete('statusharitransaksi');
	}
	//End of Delete Data Status Hari Transaksi ------------------------------------------------------------
	
}

?>