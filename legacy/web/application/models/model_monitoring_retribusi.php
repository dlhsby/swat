<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_monitoring_retribusi extends CI_Model
{
  public function __construct()
  {
    parent::__construct();
  }

    /*function get_all_retribusi_perbulan($tanggal){
          return $this->db->query("
          select JUMLAH, SUBSTR(TANGGAL, 1,7) as TANGGAL
          from retribusi
          where NAMA_KATEGORI_RETRIBUSI = 'Non-Rumah Tangga'
          and year(TANGGAL) = '".$tanggal."'
          order by TANGGAL desc
          ");
      }*/

      function get_all_retribusi_perbulan($tanggal){
            return $this->db->query("
            select SUM(JUMLAH) as JUMLAH, SUBSTR(TANGGAL, 1,7) as TANGGAL
                from retribusi
                where NAMA_KATEGORI_RETRIBUSI = 'Non-Rumah Tangga'
            and year(TANGGAL) = '".$tanggal."'
            group by month(TANGGAL)
            order by TANGGAL desc;
            ");
        }


}
