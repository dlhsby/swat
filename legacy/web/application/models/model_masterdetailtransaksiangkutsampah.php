<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_masterdetailtransaksiangkutsampah extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Master Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function get_all_masterdetailtransaksiangkutsampah(){
		$this->db->from('masterdetailtransaksiangkutsampah');
		return $this->db->get();
	}	
	
	function get_all_masterdetailtransaksiangkutsampah_with_kendaraan_and_with_pengemudi(){
		$this->db->from('masterdetailtransaksiangkutsampah');
		$this->db->join('kendaraan','masterdetailtransaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('pengemudi','masterdetailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		return $this->db->get();
	}
	
	function get_masterdetailtransaksiangkutsampah_by_id($masterdetailtransaksiangkutsampah_id){
		$this->db->where('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID',$masterdetailtransaksiangkutsampah_id);
		return $this->db->get('masterdetailtransaksiangkutsampah');
	}
	
	function get_masterdetailtransaksiangkutsampah_by_id_with_kendaraan_and_with_pengemudi($masterdetailtransaksiangkutsampah_id){
		$this->db->select('masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,kendaraan.KENDARAAN_ID,kendaraan.KENDARAAN_NOMORPOLISI,kendaraan.SPOT_POOL_ID,spot.SPOT_NAMA,pengemudi.PENGEMUDI_ID,pengemudi.PENGEMUDI_NAMA,masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG,masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG');
		$this->db->from('masterdetailtransaksiangkutsampah');
		$this->db->join('kendaraan','masterdetailtransaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('pengemudi','masterdetailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('spot','kendaraan.SPOT_POOL_ID = spot.SPOT_ID');
		return $this->db->get();
	}
	
	function get_masterdetailtransaksiangkutsampah_by_kendaraan_id($kendaraan_id){
		$this->db->where('KENDARAAN_ID',$kendaraan_id);
		return $this->db->get('masterdetailtransaksiangkutsampah');
	}	
	
	function get_all_masterdetailtransaksiangkutsampah_by_filter($nopolKendaraan,$namaPengemudi,$poolKendaraan){
		$this->db->select('masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,kendaraan.KENDARAAN_ID,kendaraan.KENDARAAN_NOMORPOLISI,kendaraan.SPOT_POOL_ID,spot.SPOT_NAMA,pengemudi.PENGEMUDI_ID,pengemudi.PENGEMUDI_NAMA,masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG,masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG');
		$this->db->from('masterdetailtransaksiangkutsampah');
		$this->db->join('kendaraan','masterdetailtransaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('pengemudi','masterdetailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('spot','kendaraan.SPOT_POOL_ID = spot.SPOT_ID');
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($namaPengemudi){
			$this->db->like('pengemudi.PENGEMUDI_NAMA',$namaPengemudi);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_masterdetailtransaksiangkutsampah_by_filter($nopolKendaraan,$namaPengemudi,$poolKendaraan,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->select('masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,kendaraan.KENDARAAN_ID,kendaraan.KENDARAAN_NOMORPOLISI,kendaraan.SPOT_POOL_ID,spot.SPOT_NAMA,pengemudi.PENGEMUDI_ID,pengemudi.PENGEMUDI_NAMA,masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG,masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG');
		$this->db->from('masterdetailtransaksiangkutsampah');
		$this->db->join('kendaraan','masterdetailtransaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID');
		$this->db->join('pengemudi','masterdetailtransaksiangkutsampah.PENGEMUDI_ID = pengemudi.PENGEMUDI_ID');
		$this->db->join('spot','kendaraan.SPOT_POOL_ID = spot.SPOT_ID');
		if($nopolKendaraan){
			$this->db->like('kendaraan.KENDARAAN_NOMORPOLISI',$nopolKendaraan);
		}
		if($namaPengemudi){
			$this->db->like('pengemudi.PENGEMUDI_NAMA',$namaPengemudi);
		}
		if($poolKendaraan){
			$this->db->where('kendaraan.SPOT_POOL_ID',$poolKendaraan);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_last_inserted_masterdetailtransaksiangkutsampah(){
		return $this->db->query("
			SELECT * FROM masterdetailtransaksiangkutsampah 
			WHERE masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = LAST_INSERT_ID();
		");
	}
	
	
	function get_complete_mastertDetailTransaksi_and_trayek_info_by_masterDetailTransaksiAngkutSampah($allmasterDetailTransaksiAngkutSampah){
		$this->db->from('masterdetailtransaksiangkutsampah');
		$this->db->join('mastertrayek','masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = mastertrayek.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID');
		$this->db->join('rute','mastertrayek.RUTE_ID = rute.RUTE_ID');
		$this->db->join('spot','rute.SPOT_TUJUAN_ID = spot.SPOT_ID');
		$this->db->join('kategorirute','rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID');
		$this->db->where('masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID',$allmasterDetailTransaksiAngkutSampah);
		return $this->db->get();	
	}
	//End of Get Data Master Detail Transaksi Angkut Sampah------------------------------------------------------------
	
	//Begin of Insert Data Master Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function insert_masterdetailtransaksiangkutsampah($new_masterdetailtransaksiangkutsampah){
		$this->db->insert('masterdetailtransaksiangkutsampah',$new_masterdetailtransaksiangkutsampah);
	}
	//End of Insert Data Master Detail Transaksi Angkut Sampah  ------------------------------------------------------------
	
	//Begin of Update Data Master Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function update_masterdetailtransaksiangkutsampah_by_id($masterdetailtransaksiangkutsampah_id,$updated_masterdetailtransaksiangkutsampah){
		$this->db->where('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID',$masterdetailtransaksiangkutsampah_id);
		$this->db->update('masterdetailtransaksiangkutsampah',$updated_masterdetailtransaksiangkutsampah);
	}
	//End of Update Data Master Detail Transaksi Angkut Sampah ------------------------------------------------------------
	
	//Begin of Delete Data Master Detail Transaksi Angkut Sampah ------------------------------------------------------------
	function delete_masterdetailtransaksiangkutsampah_by_id($masterdetailtransaksiangkutsampah_id){
		$this->db->where('MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID',$masterdetailtransaksiangkutsampah_id);
		$this->db->delete('masterdetailtransaksiangkutsampah');
	}
	//End of Delete Data Master Detail Transaksi Angkut Sampah ------------------------------------------------------------
	
}

?>