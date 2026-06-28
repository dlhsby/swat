<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_statusdetailtransaksiangkutsampah extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Status Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function get_all_statusdetailtransaksiangkutsampah(){
		$this->db->from('statusdetailtransaksiangkutsampah');
		return $this->db->get();
	}
	
	function get_statusdetailtransaksiangkutsampah_by_id($statusdetailtransaksiangkutsampah_id){
		$this->db->where('STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID',$statusdetailtransaksiangkutsampah_id);
		return $this->db->get('statusdetailtransaksiangkutsampah');
	}
	//End of Get Data Status Detail Transaksi Angkut Sampah------------------------------------------------------------
	
	//Begin of Insert Data Status Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function insert_statusdetailtransaksiangkutsampah($new_statusdetailtransaksiangkutsampah){
		$this->db->insert('statusdetailtransaksiangkutsampah',$new_statusdetailtransaksiangkutsampah);
	}
	//End of Insert Data Status Detail Transaksi Angkut Sampah  ------------------------------------------------------------
	
	//Begin of Update Data Status Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function update_statusdetailtransaksiangkutsampah_by_id($statusdetailtransaksiangkutsampah_id,$updated_statusdetailtransaksiangkutsampah){
		$this->db->where('STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID',$statusdetailtransaksiangkutsampah_id);
		$this->db->update('statusdetailtransaksiangkutsampah',$updated_statusdetailtransaksiangkutsampah);
	}
	//End of Update Data Status Detail Transaksi Angkut Sampah ------------------------------------------------------------
	
	//Begin of Delete Data Status Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function delete_statusdetailtransaksiangkutsampah_by_id($statusdetailtransaksiangkutsampah_id){
		$this->db->where('STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID',$statusdetailtransaksiangkutsampah_id);
		$this->db->delete('statusdetailtransaksiangkutsampah');
	}
	//End of Delete Data Status Detail Transaksi Angkut Sampah ------------------------------------------------------------
	
}

?>