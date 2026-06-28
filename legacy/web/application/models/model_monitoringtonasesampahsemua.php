<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Model_monitoringtonasesampahsemua extends CI_Model {
    //Begin of Constructor ------------------------------------------------------------
    function __construct() {

    }
    //End of Constructor ------------------------------------------------------------
	
	function get_all_tonase_sumber_2($daritanggalTransaksi, $sampaitanggalTransaksi)
    {
	    $query = "SELECT
  kategorisumbersampah.`KATEGORISUMBERSAMPAH_KODE`,
  kategorisumbersampah.`KATEGORISUMBERSAMPAH_NAMA`,
  SUM(trayek_beratbersihsampah) AS 'total_sampah_dari_sumber',
  FORMAT(
    SUM(trayek_beratbersihsampah) / 1000, 2) 
    AS 'total_sampah_dari_sumber_ton'
FROM
  `trayek`
  JOIN rute
    ON trayek.RUTE_ID = rute.RUTE_ID
  JOIN spot AS asal
    ON rute.SPOT_ASAL_ID = asal.SPOT_ID
  JOIN spot AS tujuan
    ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
  JOIN kategorirute
    ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
  JOIN detailtransaksiangkutsampah
    ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
  JOIN transaksiangkutsampah
    ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
  JOIN haritransaksi
    ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
  JOIN kendaraan
    ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
  JOIN kategorikendaraan
    ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
  JOIN aplikasikendaraan
    ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
  JOIN kategorisumbersampahkendaraan
    ON kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
  JOIN kategorisumbersampah
    ON kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE kategorirute.KATEGORIRUTE_ID = 4
  AND trayek.TRAYEK_BERATBERSIHSAMPAH > 0
  AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
  AND DATE(
    haritransaksi.HARITRANSAKSI_TANGGAL
  ) >= DATE('" . $daritanggalTransaksi . "')
  AND DATE(
    haritransaksi.HARITRANSAKSI_TANGGAL
  ) <= DATE('" . $sampaitanggalTransaksi . "')
GROUP BY kategorisumbersampah.`KATEGORISUMBERSAMPAH_KODE`
UNION
SELECT
  'S',
  'Swasta',
  (
    (SELECT
      SUM(BERAT) AS total1
    FROM
      (SELECT
        SUM(trayek_beratbersihsampah) AS 'BERAT'
      FROM
        `trayek`
        JOIN rute
          ON trayek.rute_id = rute.rute_id
        JOIN spot
          ON spot.spot_id = rute.spot_asal_id
        JOIN kategorirute
          ON kategorirute.kategorirute_id = rute.kategorirute_id
        JOIN detailtransaksiangkutsampah
          ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
        JOIN transaksiangkutsampah
          ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
        JOIN haritransaksi
          ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
      WHERE DATE(haritransaksi_tanggal) >= DATE('" . $daritanggalTransaksi . "')
        AND DATE(haritransaksi_tanggal) <= DATE('" . $sampaitanggalTransaksi . "')
      GROUP BY DATE(haritransaksi_tanggal)) dt) -
    (SELECT
      SUM(BERAT) AS total2
    FROM
      (SELECT
        SUM(trayek_beratbersihsampah) AS 'BERAT'
      FROM
        `trayek`
        JOIN rute
          ON trayek.RUTE_ID = rute.RUTE_ID
        JOIN spot AS asal
          ON rute.SPOT_ASAL_ID = asal.SPOT_ID
        JOIN spot AS tujuan
          ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
        JOIN kategorirute
          ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
        JOIN detailtransaksiangkutsampah
          ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
        JOIN transaksiangkutsampah
          ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
        JOIN haritransaksi
          ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
        JOIN kendaraan
          ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
        JOIN kategorikendaraan
          ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
        JOIN aplikasikendaraan
          ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
        JOIN kategorisumbersampahkendaraan
          ON kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
        JOIN kategorisumbersampah
          ON kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
      WHERE kategorirute.KATEGORIRUTE_ID = 4
        AND trayek.TRAYEK_BERATBERSIHSAMPAH > 0
        AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
        AND DATE(
          haritransaksi.HARITRANSAKSI_TANGGAL
        ) >= DATE('" . $daritanggalTransaksi . "')
        AND DATE(
          haritransaksi.HARITRANSAKSI_TANGGAL
        ) <= DATE('" . $sampaitanggalTransaksi . "')
      GROUP BY DATE(
          haritransaksi.HARITRANSAKSI_TANGGAL
        )) dt)
  ) AS 'total_sampah_dari_sumber',
  FORMAT(
    (
      (SELECT
        SUM(BERAT) AS total1
      FROM
        (SELECT
          SUM(trayek_beratbersihsampah) AS 'BERAT'
        FROM
          `trayek`
          JOIN rute
            ON trayek.rute_id = rute.rute_id
          JOIN spot
            ON spot.spot_id = rute.spot_asal_id
          JOIN kategorirute
            ON kategorirute.kategorirute_id = rute.kategorirute_id
          JOIN detailtransaksiangkutsampah
            ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
          JOIN transaksiangkutsampah
            ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
          JOIN haritransaksi
            ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
        WHERE DATE(haritransaksi_tanggal) >= DATE('" . $daritanggalTransaksi . "')
          AND DATE(haritransaksi_tanggal) <= DATE('" . $sampaitanggalTransaksi . "')
        GROUP BY DATE(haritransaksi_tanggal)) dt) -
      (SELECT
        SUM(BERAT) AS total2
      FROM
        (SELECT
          SUM(trayek_beratbersihsampah) AS 'BERAT'
        FROM
          `trayek`
          JOIN rute
            ON trayek.RUTE_ID = rute.RUTE_ID
          JOIN spot AS asal
            ON rute.SPOT_ASAL_ID = asal.SPOT_ID
          JOIN spot AS tujuan
            ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
          JOIN kategorirute
            ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
          JOIN detailtransaksiangkutsampah
            ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
          JOIN transaksiangkutsampah
            ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
          JOIN haritransaksi
            ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
          JOIN kendaraan
            ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
          JOIN kategorikendaraan
            ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
          JOIN aplikasikendaraan
            ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
          JOIN kategorisumbersampahkendaraan
            ON kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
          JOIN kategorisumbersampah
            ON kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
        WHERE kategorirute.KATEGORIRUTE_ID = 4
          AND trayek.TRAYEK_BERATBERSIHSAMPAH > 0
          AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
          AND DATE(
            haritransaksi.HARITRANSAKSI_TANGGAL
          ) >= DATE('" . $daritanggalTransaksi . "')
          AND DATE(
            haritransaksi.HARITRANSAKSI_TANGGAL
          ) <= DATE('" . $sampaitanggalTransaksi . "')
        GROUP BY DATE(
            haritransaksi.HARITRANSAKSI_TANGGAL
          )) dt)
    ) / 1000, 2) AS 'total_sampah_dari_sumber_ton'";
        $outs = $this->db->query($query);
        return $outs;

    }
	
	function get_vol_tps($daritanggalTransaksi, $sampaitanggalTransaksi,$namaTPS) {
        /*
        $query = "SELECT k.SPOT_NAMA, SUM(a.TRAYEK_BERATBERSIHSAMPAH) AS Tonase_Total FROM trayek a INNER JOIN detailtransaksiangkutsampah b ON a.DETAILTRANSAKSIANGKUTSAMPAH_ID = b.DETAILTRANSAKSIANGKUTSAMPAH_ID INNER JOIN masterdetailtransaksiangkutsampah c ON b.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = c.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID INNER JOIN kendaraan d ON c.KENDARAAN_ID = d.KENDARAAN_ID INNER JOIN transaksiangkutsampah e ON e.TRANSAKSIANGKUTSAMPAH_ID = b.TRANSAKSIANGKUTSAMPAH_ID INNER JOIN haritransaksi f ON e.HARITRANSAKSI_ID = f.HARITRANSAKSI_ID INNER JOIN kategorisumbersampahkendaraan g ON g.KENDARAAN_ID = d.KENDARAAN_ID INNER JOIN kategorisumbersampah h ON h.KATEGORISUMBERSAMPAH_ID = g.KATEGORISUMBERSAMPAH_ID INNER JOIN rute i ON i.RUTE_ID = a.RUTE_ID INNER JOIN kategorirute j ON i.KATEGORIRUTE_ID = j.KATEGORIRUTE_ID INNER JOIN spot k ON i.SPOT_ASAL_ID = k.SPOT_ID INNER JOIN kategorispot l ON l.KATEGORISPOT_ID = k.KATEGORISPOT_ID WHERE f.HARITRANSAKSI_TANGGAL >= '" . $daritanggalTransaksi . "' AND f.HARITRANSAKSI_TANGGAL <= '" . $sampaitanggalTransaksi . "' AND l.KATEGORISPOT_NAMA = 'TPS' AND a.TRAYEK_BERATBERSIHSAMPAH > 0 AND k.SPOT_NAMA = '" . $namaTPS . "';";
        */
        $query = "SELECT 
  asal.SPOT_NAMA AS SPOT_NAMA, 
  SUM(trayek.TRAYEK_BERATBERSIHSAMPAH) AS Tonase_Total
FROM
  trayek
  JOIN rute
    ON trayek.RUTE_ID = rute.RUTE_ID
  JOIN spot AS asal
    ON rute.SPOT_ASAL_ID = asal.SPOT_ID
  JOIN spot AS tujuan
    ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
  JOIN kategorirute
    ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
  JOIN detailtransaksiangkutsampah
    ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
  JOIN transaksiangkutsampah
    ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
  JOIN haritransaksi
    ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
  JOIN kendaraan
    ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
  JOIN kategorikendaraan
    ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
  JOIN aplikasikendaraan
    ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
WHERE kategorirute.KATEGORIRUTE_ID = 4
  AND haritransaksi.HARITRANSAKSI_TANGGAL >='".$daritanggalTransaksi."'
  AND haritransaksi.HARITRANSAKSI_TANGGAL <= '".$sampaitanggalTransaksi."'
  AND asal.SPOT_NAMA = '".$namaTPS."';";
        $outs = $this->db->query($query);
        return $outs;
    }

    function get_all_paging_sorting_vol_tps($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi, $sampaitanggalTransaksi,$namaTPS) {
	
		//ini_set('max_execution_time',0);
		//ini_set('memory_limit','4048M');

        $date = $sampaitanggalTransaksi;
        $end_date = $daritanggalTransaksi;
        $query = "";
        while (strtotime($end_date) <= strtotime($date)) {
            if ($date != $sampaitanggalTransaksi) {
                $query = $query . " union " . "SELECT asal.SPOT_NAMA AS SPOT_NAMA, haritransaksi.HARITRANSAKSI_TANGGAL AS Tanggal, FORMAT(SUM(trayek.TRAYEK_BERATBERSIHSAMPAH) / 1000, 2) AS Tonase_Total FROM trayek JOIN rute ON trayek.RUTE_ID = rute.RUTE_ID JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID JOIN detailtransaksiangkutsampah ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID JOIN kendaraan ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID JOIN kategorikendaraan ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID JOIN aplikasikendaraan ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID WHERE kategorirute.KATEGORIRUTE_ID = 4 AND haritransaksi.HARITRANSAKSI_TANGGAL >='" . $date . "' AND haritransaksi.HARITRANSAKSI_TANGGAL <= '" . $date . "' AND asal.SPOT_NAMA = '" . $namaTPS . "'";
            } else {
                $query = "SELECT asal.SPOT_NAMA AS SPOT_NAMA, haritransaksi.HARITRANSAKSI_TANGGAL AS Tanggal, FORMAT(SUM(trayek.TRAYEK_BERATBERSIHSAMPAH) / 1000, 2) AS Tonase_Total FROM trayek JOIN rute ON trayek.RUTE_ID = rute.RUTE_ID JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID JOIN detailtransaksiangkutsampah ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID JOIN transaksiangkutsampah ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID JOIN haritransaksi ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID JOIN kendaraan ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID JOIN kategorikendaraan ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID JOIN aplikasikendaraan ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID WHERE kategorirute.KATEGORIRUTE_ID = 4 AND haritransaksi.HARITRANSAKSI_TANGGAL >='" . $date . "' AND haritransaksi.HARITRANSAKSI_TANGGAL <= '" . $date . "' AND asal.SPOT_NAMA = '" . $namaTPS . "'";
            }
            if ($sampaitanggalTransaksi!= $daritanggalTransaksi) {
                $date = date("Y-m-d", strtotime("-1 day", strtotime($date)));
            } else {
                break;
            }
        }
        $outs = $this->db->query($query);
        return $outs;
    }


    //End of Constructor ------------------------------------------------------------
    function get_all_tonase_tps()
    {
        $query = "SELECT k.SPOT_NAMA,
              FORMAT(SUM(a.TRAYEK_BERATBERSIHSAMPAH), 0 ,'de_DE') as Tonase_Total FROM 
              trayek a INNER JOIN detailtransaksiangkutsampah b ON 
              a.DETAILTRANSAKSIANGKUTSAMPAH_ID = b.DETAILTRANSAKSIANGKUTSAMPAH_ID
              INNER JOIN masterdetailtransaksiangkutsampah c
              ON b.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = c.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
              INNER JOIN kendaraan d ON c.KENDARAAN_ID = d.KENDARAAN_ID
              INNER JOIN transaksiangkutsampah e
              ON e.TRANSAKSIANGKUTSAMPAH_ID = b.TRANSAKSIANGKUTSAMPAH_ID
              INNER JOIN haritransaksi f ON e.HARITRANSAKSI_ID = f.HARITRANSAKSI_ID
              INNER JOIN kategorisumbersampahkendaraan g ON g.KENDARAAN_ID = d.KENDARAAN_ID
              INNER JOIN kategorisumbersampah h ON 
              h.KATEGORISUMBERSAMPAH_ID = g.KATEGORISUMBERSAMPAH_ID
              INNER JOIN rute i ON i.RUTE_ID = a.RUTE_ID INNER JOIN kategorirute j
              ON i.KATEGORIRUTE_ID = j.KATEGORIRUTE_ID INNER JOIN spot k
              ON i.SPOT_ASAL_ID = k.SPOT_ID INNER JOIN kategorispot l
              ON l.KATEGORISPOT_ID = k.KATEGORISPOT_ID WHERE 
              YEAR(f.HARITRANSAKSI_TANGGAL) = '2017' AND 
              MONTH(f.HARITRANSAKSI_TANGGAL) = '11' AND
              l.KATEGORISPOT_NAMA = 'TPS' AND a.TRAYEK_BERATBERSIHSAMPAH > 0
              GROUP BY k.SPOT_NAMA ORDER BY Tonase_Total DESC;";
        $outs = $this->db->query($query);
        return $outs;
    }

    function get_all_paging_sorting_all_tonase_tps($jtStartIndex, $jtPageSize, $jtSorting)
    {
        $query = "SELECT k.SPOT_NAMA,
              FORMAT(SUM(a.TRAYEK_BERATBERSIHSAMPAH), 0 ,'de_DE') as Tonase_Total FROM 
              trayek a INNER JOIN detailtransaksiangkutsampah b ON 
              a.DETAILTRANSAKSIANGKUTSAMPAH_ID = b.DETAILTRANSAKSIANGKUTSAMPAH_ID
              INNER JOIN masterdetailtransaksiangkutsampah c
              ON b.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = c.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
              INNER JOIN kendaraan d ON c.KENDARAAN_ID = d.KENDARAAN_ID
              INNER JOIN transaksiangkutsampah e
              ON e.TRANSAKSIANGKUTSAMPAH_ID = b.TRANSAKSIANGKUTSAMPAH_ID
              INNER JOIN haritransaksi f ON e.HARITRANSAKSI_ID = f.HARITRANSAKSI_ID
              INNER JOIN kategorisumbersampahkendaraan g ON g.KENDARAAN_ID = d.KENDARAAN_ID
              INNER JOIN kategorisumbersampah h ON 
              h.KATEGORISUMBERSAMPAH_ID = g.KATEGORISUMBERSAMPAH_ID
              INNER JOIN rute i ON i.RUTE_ID = a.RUTE_ID INNER JOIN kategorirute j
              ON i.KATEGORIRUTE_ID = j.KATEGORIRUTE_ID INNER JOIN spot k
              ON i.SPOT_ASAL_ID = k.SPOT_ID INNER JOIN kategorispot l
              ON l.KATEGORISPOT_ID = k.KATEGORISPOT_ID WHERE 
              YEAR(f.HARITRANSAKSI_TANGGAL) = '2017' AND 
              MONTH(f.HARITRANSAKSI_TANGGAL) = '11' AND
              l.KATEGORISPOT_NAMA = 'TPS' AND a.TRAYEK_BERATBERSIHSAMPAH > 0
              GROUP BY k.SPOT_NAMA ORDER BY Tonase_Total DESC;";
        $outs = $this->db->query($query);
        return $outs;
    }

    function get_all_tonase_sumber($daritanggalTransaksi, $sampaitanggalTransaksi)
    {
        $query = "SELECT h.KATEGORISUMBERSAMPAH_KODE,
                  h.KATEGORISUMBERSAMPAH_NAMA,
                  FORMAT(SUM(a.TRAYEK_BERATBERSIHSAMPAH), 0 ,'de_DE') AS total_sampah_dari_sumber,
                  SUM(a.TRAYEK_BERATBERSIHSAMPAH) AS total_sampah_dari_sumber_no_format FROM 
                  trayek a INNER JOIN detailtransaksiangkutsampah b
                  ON a.DETAILTRANSAKSIANGKUTSAMPAH_ID = b.DETAILTRANSAKSIANGKUTSAMPAH_ID
                  INNER JOIN masterdetailtransaksiangkutsampah c
                  ON b.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID = c.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
                  INNER JOIN kendaraan d ON c.KENDARAAN_ID = d.KENDARAAN_ID
                  INNER JOIN transaksiangkutsampah e
                  ON e.TRANSAKSIANGKUTSAMPAH_ID = b.TRANSAKSIANGKUTSAMPAH_ID
                  INNER JOIN haritransaksi f ON e.HARITRANSAKSI_ID = f.HARITRANSAKSI_ID
                  INNER JOIN kategorisumbersampahkendaraan g
                  ON g.KENDARAAN_ID = d.KENDARAAN_ID
                  INNER JOIN kategorisumbersampah h
                  ON h.KATEGORISUMBERSAMPAH_ID = g.KATEGORISUMBERSAMPAH_ID
                  WHERE 
                  f.HARITRANSAKSI_TANGGAL >= '" . $daritanggalTransaksi . "' AND 
                  f.HARITRANSAKSI_TANGGAL <= '" . $sampaitanggalTransaksi . "' AND 
                  a.TRAYEK_BERATBERSIHSAMPAH > 0
                  GROUP BY h.KATEGORISUMBERSAMPAH_KODE;";
        $outs = $this->db->query($query);
        return $outs;
    }

    function get_all_paging_sorting_all_tonase_sumber($jtStartIndex, $jtPageSize, $jtSorting, $daritanggalTransaksi, $sampaitanggalTransaksi)
    {
	$query = "SELECT
  kategorisumbersampah.`KATEGORISUMBERSAMPAH_KODE`,
  kategorisumbersampah.`KATEGORISUMBERSAMPAH_NAMA`,
  SUM(trayek_beratbersihsampah) AS 'total_sampah_dari_sumber',
  FORMAT(
    SUM(trayek_beratbersihsampah) / 1000, 2) 
    AS 'total_sampah_dari_sumber_ton'
FROM
  `trayek`
  JOIN rute
    ON trayek.RUTE_ID = rute.RUTE_ID
  JOIN spot AS asal
    ON rute.SPOT_ASAL_ID = asal.SPOT_ID
  JOIN spot AS tujuan
    ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
  JOIN kategorirute
    ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
  JOIN detailtransaksiangkutsampah
    ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
  JOIN transaksiangkutsampah
    ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
  JOIN haritransaksi
    ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
  JOIN kendaraan
    ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
  JOIN kategorikendaraan
    ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
  JOIN aplikasikendaraan
    ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
  JOIN kategorisumbersampahkendaraan
    ON kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
  JOIN kategorisumbersampah
    ON kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE kategorirute.KATEGORIRUTE_ID = 4
  AND trayek.TRAYEK_BERATBERSIHSAMPAH > 0
  AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
  AND DATE(
    haritransaksi.HARITRANSAKSI_TANGGAL
  ) >= DATE('" . $daritanggalTransaksi . "')
  AND DATE(
    haritransaksi.HARITRANSAKSI_TANGGAL
  ) <= DATE('" . $sampaitanggalTransaksi . "')
GROUP BY kategorisumbersampah.`KATEGORISUMBERSAMPAH_KODE`
UNION
SELECT
  'S',
  'Swasta',
  (
    (SELECT
      SUM(BERAT) AS total1
    FROM
      (SELECT
        SUM(trayek_beratbersihsampah) AS 'BERAT'
      FROM
        `trayek`
        JOIN rute
          ON trayek.rute_id = rute.rute_id
        JOIN spot
          ON spot.spot_id = rute.spot_asal_id
        JOIN kategorirute
          ON kategorirute.kategorirute_id = rute.kategorirute_id
        JOIN detailtransaksiangkutsampah
          ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
        JOIN transaksiangkutsampah
          ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
        JOIN haritransaksi
          ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
      WHERE DATE(haritransaksi_tanggal) >= DATE('" . $daritanggalTransaksi . "')
        AND DATE(haritransaksi_tanggal) <= DATE('" . $sampaitanggalTransaksi . "')
      GROUP BY DATE(haritransaksi_tanggal)) dt) -
    (SELECT
      SUM(BERAT) AS total2
    FROM
      (SELECT
        SUM(trayek_beratbersihsampah) AS 'BERAT'
      FROM
        `trayek`
        JOIN rute
          ON trayek.RUTE_ID = rute.RUTE_ID
        JOIN spot AS asal
          ON rute.SPOT_ASAL_ID = asal.SPOT_ID
        JOIN spot AS tujuan
          ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
        JOIN kategorirute
          ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
        JOIN detailtransaksiangkutsampah
          ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
        JOIN transaksiangkutsampah
          ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
        JOIN haritransaksi
          ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
        JOIN kendaraan
          ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
        JOIN kategorikendaraan
          ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
        JOIN aplikasikendaraan
          ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
        JOIN kategorisumbersampahkendaraan
          ON kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
        JOIN kategorisumbersampah
          ON kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
      WHERE kategorirute.KATEGORIRUTE_ID = 4
        AND trayek.TRAYEK_BERATBERSIHSAMPAH > 0
        AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
        AND DATE(
          haritransaksi.HARITRANSAKSI_TANGGAL
        ) >= DATE('" . $daritanggalTransaksi . "')
        AND DATE(
          haritransaksi.HARITRANSAKSI_TANGGAL
        ) <= DATE('" . $sampaitanggalTransaksi . "')
      GROUP BY DATE(
          haritransaksi.HARITRANSAKSI_TANGGAL
        )) dt)
  ) AS 'total_sampah_dari_sumber',
  FORMAT(
    (
      (SELECT
        SUM(BERAT) AS total1
      FROM
        (SELECT
          SUM(trayek_beratbersihsampah) AS 'BERAT'
        FROM
          `trayek`
          JOIN rute
            ON trayek.rute_id = rute.rute_id
          JOIN spot
            ON spot.spot_id = rute.spot_asal_id
          JOIN kategorirute
            ON kategorirute.kategorirute_id = rute.kategorirute_id
          JOIN detailtransaksiangkutsampah
            ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
          JOIN transaksiangkutsampah
            ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
          JOIN haritransaksi
            ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
        WHERE DATE(haritransaksi_tanggal) >= DATE('" . $daritanggalTransaksi . "')
          AND DATE(haritransaksi_tanggal) <= DATE('" . $sampaitanggalTransaksi . "')
        GROUP BY DATE(haritransaksi_tanggal)) dt) -
      (SELECT
        SUM(BERAT) AS total2
      FROM
        (SELECT
          SUM(trayek_beratbersihsampah) AS 'BERAT'
        FROM
          `trayek`
          JOIN rute
            ON trayek.RUTE_ID = rute.RUTE_ID
          JOIN spot AS asal
            ON rute.SPOT_ASAL_ID = asal.SPOT_ID
          JOIN spot AS tujuan
            ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
          JOIN kategorirute
            ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
          JOIN detailtransaksiangkutsampah
            ON trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
          JOIN transaksiangkutsampah
            ON detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
          JOIN haritransaksi
            ON haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
          JOIN kendaraan
            ON transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
          JOIN kategorikendaraan
            ON kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
          JOIN aplikasikendaraan
            ON kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
          JOIN kategorisumbersampahkendaraan
            ON kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
          JOIN kategorisumbersampah
            ON kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
        WHERE kategorirute.KATEGORIRUTE_ID = 4
          AND trayek.TRAYEK_BERATBERSIHSAMPAH > 0
          AND kategorisumbersampah.KATEGORISUMBERSAMPAH_NAMA != 'Swasta'
          AND DATE(
            haritransaksi.HARITRANSAKSI_TANGGAL
          ) >= DATE('" . $daritanggalTransaksi . "')
          AND DATE(
            haritransaksi.HARITRANSAKSI_TANGGAL
          ) <= DATE('" . $sampaitanggalTransaksi . "')
        GROUP BY DATE(
            haritransaksi.HARITRANSAKSI_TANGGAL
          )) dt)
    ) / 1000, 2) AS 'total_sampah_dari_sumber_ton'";
	
        $outs = $this->db->query($query);
        return $outs;
    }

    //Begin of Get Data Kendaraan ------------------------------------------------------------
    function get_all_tonase_sampah_lima_hari($tanggal){
        return $this->db->query("
            SELECT SUM( TRAYEK_BERATBERSIHSAMPAH ) AS BERAT, DATE_FORMAT(DATE( haritransaksi.haritransaksi_tanggal ),'%Y-%m-%d') AS TANGGAL FROM  `trayek`
			JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
			WHERE DATE(haritransaksi.haritransaksi_tanggal) <= DATE('".$tanggal."')
            GROUP BY haritransaksi_tanggal
            ORDER BY TANGGAL DESC
            LIMIT 0 , 5
        ");
    }
	function get_all_tonase_sampah_satu_bulan($tanggal){
        return $this->db->query("
            SELECT SUM( TRAYEK_BERATBERSIHSAMPAH ) AS BERAT, DATE_FORMAT(DATE( haritransaksi.haritransaksi_tanggal ),'%Y-%m-%d') AS TANGGAL FROM  `trayek`
			JOIN rute on trayek.RUTE_ID = rute.RUTE_ID
JOIN spot AS asal ON rute.SPOT_ASAL_ID = asal.SPOT_ID
JOIN spot AS tujuan ON rute.SPOT_TUJUAN_ID = tujuan.SPOT_ID
JOIN kategorirute ON rute.KATEGORIRUTE_ID = kategorirute.KATEGORIRUTE_ID
JOIN detailtransaksiangkutsampah on trayek.DETAILTRANSAKSIANGKUTSAMPAH_ID = detailtransaksiangkutsampah.DETAILTRANSAKSIANGKUTSAMPAH_ID
JOIN transaksiangkutsampah on detailtransaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID = transaksiangkutsampah.TRANSAKSIANGKUTSAMPAH_ID
JOIN haritransaksi on haritransaksi.HARITRANSAKSI_ID = transaksiangkutsampah.HARITRANSAKSI_ID
JOIN kendaraan on transaksiangkutsampah.KENDARAAN_ID = kendaraan.KENDARAAN_ID
JOIN kategorikendaraan on kendaraan.KATEGORIKENDARAAN_ID = kategorikendaraan.KATEGORIKENDARAAN_ID
JOIN aplikasikendaraan on kategorikendaraan.APLIKASIKENDARAAN_ID = aplikasikendaraan.APLIKASIKENDARAAN_ID
			WHERE MONTH(haritransaksi.haritransaksi_tanggal) = MONTH('".$tanggal."')
			AND YEAR (haritransaksi.haritransaksi_tanggal) = YEAR('".$tanggal."')
            GROUP BY haritransaksi_tanggal
            ORDER BY TANGGAL DESC
        ");
    }
    function get_tonase_sampah_lima_hari_TPS($tanggal){
        return $this->db->query("
            SELECT spot_nama AS NAMA, DATE_FORMAT(haritransaksi_tanggal,'%Y-%m-%d' ) AS TANGGAL, SUM( trayek_beratbersihsampah ) AS BERAT
            FROM  `trayek`
            JOIN rute ON trayek.rute_id = rute.rute_id
            JOIN spot ON spot.spot_id = rute.spot_asal_id
            JOIN kategorirute ON kategorirute.kategorirute_id = rute.kategorirute_id
            JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
            JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
            JOIN haritransaksi ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
            WHERE DATE(haritransaksi_tanggal) = DATE('".$tanggal."')
            GROUP BY spot_nama, haritransaksi_tanggal DESC
            ORDER BY SUM( trayek_beratbersihsampah ) DESC
            LIMIT 5
        ");
    }
    function get_detail_tonase_sampah_lima_hari_TPS($data, $tanggal){
        return $this->db->query("
            SELECT spot_nama AS NAMA, haritransaksi_tanggal AS TANGGAL, SUM( trayek_beratbersihsampah ) AS TONASE
            FROM  `trayek`
            JOIN rute ON trayek.rute_id = rute.rute_id
            JOIN spot ON spot.spot_id = rute.spot_asal_id
            JOIN kategorirute ON kategorirute.kategorirute_id = rute.kategorirute_id
            JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
            JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
            JOIN haritransaksi ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
            WHERE (
            DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."')
            OR DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 1 DAY
			OR DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 2 DAY
			or DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 3 DAY
			or DATE(haritransaksi.haritransaksi_tanggal) = DATE('".$tanggal."') - INTERVAL 4 DAY
            )
            AND spot_nama =  '".$data."'
            GROUP BY spot_nama, haritransaksi_tanggal DESC
            LIMIT 0 , 5
        ");
    }

    function get_selisih_tonase($tanggal)
    {
        return $this->db->query("
       SELECT DATE_FORMAT( trayek_wakturealisasi,  '%Y-%m-%d' ) AS  'WAKTU', SUM( trayek_beratbersihsampah ) AS  'BERAT'
FROM  `trayek`
JOIN rute ON trayek.rute_id = rute.rute_id
            JOIN spot ON spot.spot_id = rute.spot_asal_id
            JOIN kategorirute ON kategorirute.kategorirute_id = rute.kategorirute_id
            JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
            JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
            JOIN haritransaksi ON haritransaksi.haritransaksi_id = transaksiangkutsampah.haritransaksi_id
WHERE DATE(haritransaksi_tanggal) >= DATE( '".$tanggal."' ) -1
    AND DATE(haritransaksi_tanggal) <= DATE( '".$tanggal."' )
GROUP BY DATE(haritransaksi_tanggal)
ORDER BY DATE(haritransaksi_tanggal) DESC
        ");
    }

    function get_tonase_jenis_sampah($tanggal){
        return $this->db->query("
SELECT kategorisumbersampah_nama AS  'label' , sum(trayek_beratbersihsampah) AS 'data'
FROM trayek
JOIN detailtransaksiangkutsampah ON detailtransaksiangkutsampah.detailtransaksiangkutsampah_id = trayek.detailtransaksiangkutsampah_id
JOIN transaksiangkutsampah ON transaksiangkutsampah.transaksiangkutsampah_id = detailtransaksiangkutsampah.transaksiangkutsampah_id
JOIN kendaraan ON transaksiangkutsampah.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampahkendaraan on kategorisumbersampahkendaraan.kendaraan_id = kendaraan.kendaraan_id
JOIN kategorisumbersampah on kategorisumbersampah.kategorisumbersampah_id = kategorisumbersampahkendaraan.kategorisumbersampah_id
WHERE DATE( trayek_wakturealisasi ) = DATE( '".$tanggal."' )
GROUP BY kategorisumbersampah_kode
ORDER BY MAX( trayek_wakturealisasi ) DESC
        ");
    }
}

?>
