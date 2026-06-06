<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_detailtransaksiangkutsampah extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function get_all_detailtransaksiangkutsampah(){
		$this->db->from('detailtransaksiangkutsampah');
		return $this->db->get();
	}
	
	function get_all_detailtransaksiangkutsampah_with_pengemudi_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah(){
		$this->db->from('detailtransaksiangkutsampah');
		$this->db->join('pengemudi','detailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('statusdetailtransaksiangkutsampah','detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = statusdetailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('transaksiangkutsampah','detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID');
		return $this->db->get();
	}
	
	function get_all_detailtransaksiangkutsampah_with_pengemudi_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah_by_filter($transaksiID,$statusDetailTransaksi){
		$this->db->from('detailtransaksiangkutsampah');
		$this->db->join('pengemudi','detailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('statusdetailtransaksiangkutsampah','detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = statusdetailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID');
		
		if($transaksiID){
			$this->db->where('detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID',$transaksiID);
		}
		if($statusDetailTransaksi){
			$this->db->where('detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID',$statusDetailTransaksi);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_detailtransaksiangkutsampah_with_pengemudi_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah_by_filter($transaksiID,$statusDetailTransaksi,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('detailtransaksiangkutsampah');
		$this->db->join('pengemudi','detailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('statusdetailtransaksiangkutsampah','detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = statusdetailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID');		
		if($transaksiID){
			$this->db->where('detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID',$transaksiID);
		}
		if($statusDetailTransaksi){
			$this->db->where('detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID',$statusDetailTransaksi);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_detailtransaksiangkutsampah_by_id($detailtransaksiangkutsampah_id){
		$this->db->where('DETAILTRANSAKSIANGKUTSAMPAH_ID',$detailtransaksiangkutsampah_id);
		return $this->db->get('detailtransaksiangkutsampah');
	}	
	
	function get_detailtransaksiangkutsampah_by_detailtransaksiangkutsampah_id_with_pengemudi_and_masterdetailtransaksiangkutsampah_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah($detailtransaksiangkutsampah_id){
		$this->db->where('detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID',$detailtransaksiangkutsampah_id);
		$this->db->from('detailtransaksiangkutsampah');
		$this->db->join('pengemudi','detailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('statusdetailtransaksiangkutsampah','detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = statusdetailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('transaksiangkutsampah','detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID');
		return $this->db->get();
	}
	
	function get_detailtransaksiangkutsampah_by_transaksiangkutsampah_id_with_pengemudi_and_masterdetailtransaksiangkutsampah_and_statusdetailtransaksiangkutsampah_and_transaksiangkutsampah($transaksiangkutsampah_id){
		$this->db->where('detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		$this->db->from('detailtransaksiangkutsampah');
		$this->db->join('pengemudi','detailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('statusdetailtransaksiangkutsampah','detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID = statusdetailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('transaksiangkutsampah','detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID');
		return $this->db->get();
	}
	
	function get_detailtransaksiangkutsampah_by_transaksiangkutsampah_id($transaksiangkutsampah_id){
		$this->db->where('TRANSAKSIANGKUTSAMPAH_ID',$transaksiangkutsampah_id);
		return $this->db->get('detailtransaksiangkutsampah');
	}
	
	function get_detailtransaksiangkutsampah_by_tanggal_and_kendaraan_and_status($tanggalHariIni,$kendaraanID,$statusDetailTransaksi){
		$this->db->from('detailtransaksiangkutsampah');
		$this->db->join('transaksiangkutsampah','detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('haritransaksi','transaksiangkutsampah.HARITRANSAKSI_ID = haritransaksi.HARITRANSAKSI_ID');
		$this->db->where('haritransaksi.HARITRANSAKSI_TANGGAL',$tanggalHariIni);
		$this->db->where('transaksiangkutsampah.KENDARAAN_ID',$kendaraanID);
		$this->db->where('detailtransaksiangkutsampah.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID',$statusDetailTransaksi);
		return $this->db->get();
	}
	
	function get_last_inserted_detailtransaksiangkutsampah(){
		return $this->db->query("
			SELECT * FROM detailtransaksiangkutsampah 
			WHERE detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Detail Transaksi Angkut Sampah------------------------------------------------------------
	
	//Begin of Insert Data Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function insert_detailtransaksiangkutsampah($new_detailtransaksiangkutsampah){
		$this->db->insert('detailtransaksiangkutsampah',$new_detailtransaksiangkutsampah);
	}
	//End of Insert Data Detail Transaksi Angkut Sampah  ------------------------------------------------------------
	
	//Begin of Update Data Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function update_detailtransaksiangkutsampah_by_id($detailtransaksiangkutsampah_id,$updated_detailtransaksiangkutsampah){
		$this->db->where('DETAILTRANSAKSIANGKUTSAMPAH_ID',$detailtransaksiangkutsampah_id);
		$this->db->update('detailtransaksiangkutsampah',$updated_detailtransaksiangkutsampah);
	}
	//End of Update Data Detail Transaksi Angkut Sampah ------------------------------------------------------------
	
	//Begin of Delete Data Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function delete_detailtransaksiangkutsampah_by_id($detailtransaksiangkutsampah_id){
		$this->db->where('DETAILTRANSAKSIANGKUTSAMPAH_ID',$detailtransaksiangkutsampah_id);
		$this->db->delete('detailtransaksiangkutsampah');
	}
	//End of Delete Data Detail Transaksi Angkut Sampah ------------------------------------------------------------
	
}

?>