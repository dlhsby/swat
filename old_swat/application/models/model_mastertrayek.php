<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_mastertrayek extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Master Trayek ------------------------------------------------------------
	function get_all_mastertrayek(){
		$this->db->from('mastertrayek');
		return $this->db->get();
	}
	
	function get_mastertrayek_by_id($mastertrayek_id){
		$this->db->where('MASTERTRAYEK_ID',$mastertrayek_id);
		return $this->db->get('mastertrayek');
	}
		
	function get_mastertrayek_by_mastertrayek_id_with_masterdetailtransaksiangkutsampah_and_rute($masterTrayekID){
		return $this->db->query("select masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,mastertrayek.MASTERTRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA,mastertrayek.MASTERTRAYEK_WAKTUTARGET,mastertrayek.MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN from mastertrayek 
JOIN masterdetailtransaksiangkutsampah on mastertrayek.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN rute on mastertrayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
WHERE mastertrayek.MASTERTRAYEK_ID = ".$masterTrayekID."
ORDER BY mastertrayek.MASTERTRAYEK_WAKTUTARGET");
		return $this->db->get();
	}	  	 
	
	function get_mastertrayek_by_masterdetailtransaksiangkutsampah_id_with_masterdetailtransaksiangkutsampah_and_rute($masterDetailTransaksiID){
		return $this->db->query("select masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,mastertrayek.MASTERTRAYEK_ID, asal.KATEGORISPOT_ID as KATEGORI_SPOT_ASAL_ID,asal.SPOT_ID as SPOT_ASAL_ID, asal.SPOT_NAMA as SPOT_ASAL_NAMA, tujuan.KATEGORISPOT_ID as KATEGORI_SPOT_TUJUAN_ID,tujuan.SPOT_ID as SPOT_TUJUAN_ID, tujuan.SPOT_NAMA as SPOT_TUJUAN_NAMA,mastertrayek.MASTERTRAYEK_WAKTUTARGET,mastertrayek.MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN from mastertrayek 
JOIN masterdetailtransaksiangkutsampah on mastertrayek.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN rute on mastertrayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
WHERE masterdetailtransaksiangkutsampah.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = ".$masterDetailTransaksiID."
ORDER BY mastertrayek.MASTERTRAYEK_WAKTUTARGET");
		return $this->db->get();
	}
	
	
	function get_last_inserted_mastertrayek(){
		return $this->db->query("
			SELECT * FROM mastertrayek 
			WHERE mastertrayek.MASTERTRAYEK_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Master Trayek------------------------------------------------------------
	
	//Begin of Insert Data Master Trayek ------------------------------------------------------------
	function insert_mastertrayek($new_mastertrayek){
		$this->db->insert('mastertrayek',$new_mastertrayek);
	}
	//End of Insert Data Master Trayek  ------------------------------------------------------------
	
	//Begin of Update Data Master Trayek ------------------------------------------------------------
	function update_mastertrayek_by_id($mastertrayek_id,$updated_mastertrayek){
		$this->db->where('MASTERTRAYEK_ID',$mastertrayek_id);
		$this->db->update('mastertrayek',$updated_mastertrayek);
	}
	//End of Update Data Master Trayek ------------------------------------------------------------
	
	//Begin of Delete Data Master Trayek ------------------------------------------------------------
	function delete_mastertrayek_by_id($mastertrayek_id){
		$this->db->where('MASTERTRAYEK_ID',$mastertrayek_id);
		$this->db->delete('mastertrayek');
	}
	//End of Delete Data Master Trayek ------------------------------------------------------------
	
}

?>