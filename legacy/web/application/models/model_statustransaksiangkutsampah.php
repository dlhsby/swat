<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statustransaksiangkutsampah extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Transaksi Angkut Sampah ------------------------------------------------------------
	function get_all_statustransaksiangkutsampah(){
		$this->db->from('statustransaksiangkutsampah');
		return $this->db->get();
	}
	
	function get_statustransaksiangkutsampah_by_id($statustransaksiangkutsampah_id){
		$this->db->where('STATUSTRANSAKSIANGKUTSAMPAH_ID',$statustransaksiangkutsampah_id);
		return $this->db->get('statustransaksiangkutsampah');
	}
	//End of Get Data Status Transaksi Angkut Sampah------------------------------------------------------------
	
	//Begin of Insert Data Status Transaksi Angkut Sampah ------------------------------------------------------------
	function insert_statustransaksiangkutsampah($new_statustransaksiangkutsampah){
		$this->db->insert('statustransaksiangkutsampah',$new_statustransaksiangkutsampah);
	}
	//End of Insert Data Status Transaksi Angkut Sampah  ------------------------------------------------------------
	
	//Begin of Update Data Status Transaksi Angkut Sampah ------------------------------------------------------------
	function update_statustransaksiangkutsampah_by_id($statustransaksiangkutsampah_id,$updated_statustransaksiangkutsampah){
		$this->db->where('STATUSTRANSAKSIANGKUTSAMPAH_ID',$statustransaksiangkutsampah_id);
		$this->db->update('statustransaksiangkutsampah',$updated_statustransaksiangkutsampah);
	}
	//End of Update Data Status Transaksi Angkut Sampah ------------------------------------------------------------
	
	//Begin of Delete Data Status Transaksi Angkut Sampah ------------------------------------------------------------
	function delete_statustransaksiangkutsampah_by_id($statustransaksiangkutsampah_id){
		$this->db->where('STATUSTRANSAKSIANGKUTSAMPAH_ID',$statustransaksiangkutsampah_id);
		$this->db->delete('statustransaksiangkutsampah');
	}
	//End of Delete Data Status Transaksi Angkut Sampah ------------------------------------------------------------
	
}

?>