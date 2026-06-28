<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_rute extends CI_Model {
	//Begin of Constructor ------------------------------------------------------------
	function __construct() {
		
	}
	//End of Constructor ------------------------------------------------------------
	
	//Begin of Get Data Rute ------------------------------------------------------------
	function get_all_rute(){
		$this->db->from('rute');
		return $this->db->get();
	}
	
	function get_all_rute_by_filter($kategoriRute,$asalSpot,$tujuanSpot){
		$this->db->from('rute');
		if($kategoriRute){
			$this->db->where('KATEGORIRUTE_ID ',$kategoriRute);
		}
		if($asalSpot){
			$this->db->where('SPOT_ASAL_ID',$asalSpot);
		}
		if($tujuanSpot){
			$this->db->where('SPOT_TUJUAN_ID',$tujuanSpot);
		}
		return $this->db->get();
	}
	
	function get_all_paging_sorting_rute($jtStartIndex,$jtPageSize,$jtSorting){
		return $this->db->query("
			SELECT * FROM rute 
			ORDER BY " . $jtSorting . 
			" LIMIT " . $jtStartIndex . "," . $jtPageSize . ";
		");
	}
	
	function get_all_paging_sorting_rute_by_filter($kategoriRute,$asalSpot,$tujuanSpot,$jtStartIndex,$jtPageSize,$jtSorting){
		$this->db->from('rute');
		if($kategoriRute){
			$this->db->where('KATEGORIRUTE_ID ',$kategoriRute);
		}
		if($asalSpot){
			$this->db->where('SPOT_ASAL_ID',$asalSpot);
		}
		if($tujuanSpot){
			$this->db->where('SPOT_TUJUAN_ID',$tujuanSpot);
		}
		$this->db->order_by($jtSorting);	
		$this->db->limit($jtPageSize,$jtStartIndex) ;
		return $this->db->get();
	}
	
	function get_all_rute_with_spot_asal_and_spot_tujuan_and_kategorirute_nama(){
		return $this->db->query("SELECT rute.RUTE_ID,kategorirute.KATEGORIRUTE_NAMA,asal.SPOT_NAMA AS RUTE_ASAL,tujuan.SPOT_NAMA AS RUTE_TUJUAN, rute.RUTE_JARAK 
FROM rute
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
ORDER BY asal.SPOT_NAMA ASC , tujuan.SPOT_NAMA ASC");
	}
	
	function get_rute_by_id($rute_id){
		$this->db->where('RUTE_ID',$rute_id);
		return $this->db->get('rute');
	}
	
	function get_rute_by_rute_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($rute_id){
		return $this->db->query("SELECT rute.RUTE_ID,kategorirute.KATEGORIRUTE_NAMA,asal.SPOT_NAMA AS RUTE_ASAL,tujuan.SPOT_NAMA AS RUTE_TUJUAN, rute.RUTE_JARAK 
FROM rute
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
WHERE rute.RUTE_ID = ".$rute_id."");
	}
	
	function get_rute_by_spot_asal_id_and_spot_tujuan_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($spotAsalID,$spotTujuanID){
		return $this->db->query("SELECT rute.RUTE_ID,kategorirute.KATEGORIRUTE_NAMA,asal.SPOT_ID AS RUTE_ASAL_ID,tujuan.SPOT_ID AS RUTE_TUJUAN_ID,asal.SPOT_NAMA AS RUTE_ASAL_NAMA,tujuan.SPOT_NAMA AS RUTE_TUJUAN_NAMA, rute.RUTE_JARAK 
		FROM rute
		JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
		JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
		JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
		WHERE rute.SPOT_ASAL_ID = ".$spotAsalID."
		AND rute.SPOT_TUJUAN_ID = ".$spotTujuanID."
		ORDER BY asal.KATEGORISPOT_ID ASC, asal.SPOT_NAMA ASC ,tujuan.KATEGORISPOT_ID ASC, tujuan.SPOT_NAMA ASC");
	}
	
	function get_rute_by_kategorirute_id_with_spot_asal_and_spot_tujuan_and_kategorirute_nama($kategorirute_id){
		return $this->db->query("SELECT rute.RUTE_ID,kategorirute.KATEGORIRUTE_NAMA,asal.SPOT_ID AS RUTE_ASAL_ID,tujuan.SPOT_ID AS RUTE_TUJUAN_ID,asal.SPOT_NAMA AS RUTE_ASAL,tujuan.SPOT_NAMA AS RUTE_TUJUAN, rute.RUTE_JARAK 
FROM rute
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
WHERE kategorirute.KATEGORIRUTE_ID = ".$kategorirute_id."
ORDER BY asal.KATEGORISPOT_ID ASC, asal.SPOT_NAMA ASC ,tujuan.KATEGORISPOT_ID ASC, tujuan.SPOT_NAMA ASC");
	}
	
	function get_last_inserted_rute(){
		return $this->db->query("
			SELECT * FROM rute 
			WHERE rute.RUTE_ID = LAST_INSERT_ID();
		");
	}
	//End of Get Data Rute------------------------------------------------------------
	
	//Begin of Insert Data Rute ------------------------------------------------------------
	function insert_rute($new_rute){
		$this->db->insert('rute',$new_rute);
	}
	//End of Insert Data Rute  ------------------------------------------------------------
	
	//Begin of Update Data Rute ------------------------------------------------------------
	function update_rute_by_id($rute_id,$updated_rute){
		$this->db->where('RUTE_ID',$rute_id);
		$this->db->update('rute',$updated_rute);
	}
	//End of Update Data Rute ------------------------------------------------------------
	
	//Begin of Delete Data Rute ------------------------------------------------------------
	function delete_rute_by_id($rute_id){
		$this->db->where('RUTE_ID',$rute_id);
		$this->db->delete('rute');
	}
	//End of Delete Data Rute ------------------------------------------------------------
	
}

?>