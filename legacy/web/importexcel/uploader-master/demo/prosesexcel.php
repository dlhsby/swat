<?php
require_once 'PHPExcel/IOFactory.php';

$pf = json_decode($_POST['filevar'], true);

$fileexcel = "";
foreach ($pf as $pf_item) {
    if (stripos($pf_item, "xls") !== false) {
        $fileexcel = "./backend/" . trim($pf_item);
    }
}

$_MYSQL_HOST = "localhost";
$_MYSQL_USER = "AdminDKP";
$_MYSQL_PASS = "Dkpmenur31";
$_MYSQL_DB = "dkp_swat";
$connect = mysql_connect($_MYSQL_HOST, $_MYSQL_USER, $_MYSQL_PASS) or die(mysql_error());
mysql_select_db($_MYSQL_DB);

mysql_query("delete from sampahmasuktpa") or die(mysql_error());

mysql_query("ALTER TABLE sampahmasuktpa AUTO_INCREMENT = 1") or die(mysql_error());

$objPHPExcel = PHPExcel_IOFactory::load($fileexcel);

$no = "";
$jammasuk = "";
$jamkeluar = "";
$nopol = "";
$lpsdepo = "";
$truk = "";
$beratkotor = "";
$beratkosong = "";
$beratbersih = "";
$sheetname = "";

foreach ($objPHPExcel->getWorksheetIterator() as $worksheet) {

    $sheetname = trim($worksheet->getTitle());
    $highestRow = $worksheet->getHighestRow();
    $highestColumn = $worksheet->getHighestColumn();
    $highestColumnIndex = PHPExcel_Cell::columnIndexFromString($highestColumn);

    $f1 = false;
    $f2 = false;

    /*
      echo "**********************\n";
      echo "Sheet : " . $sheetname . "\n";
      echo "**********************\n";
     */

    for ($row = 1; $row <= $highestRow; ++$row) {

        for ($col = 0; $col < $highestColumnIndex; ++$col) {
            $cell = $worksheet->getCellByColumnAndRow($col, $row);
            $val = trim($cell->getValue());

            if (($col == 0) && ($val == "1")) {
                $f1 = true;
            }

            if ($col == 0 && strtolower($val) == "jumlah") {
                $f1 = false;
            }

            if ($col == 0 && $row == 4) {
                $cell = $worksheet->getCellByColumnAndRow($col, $row);
                $val = trim($cell->getValue());
                $tgltitle = PHPExcel_Style_NumberFormat::toFormattedString($cell->getCalculatedValue(), 'dd-MM-YYYY');
            }

            if ($f1) {

                $cell = $worksheet->getCellByColumnAndRow($col, $row);
                $val = trim($cell->getValue());
                if (stripos($val, "=") !== false) {
                    if ($col > 0 && $col < 3) {
                        $val = PHPExcel_Style_NumberFormat::toFormattedString($cell->getCalculatedValue(), 'hh:mm:ss');
                    } else {
                        $val = trim($cell->getOldCalculatedValue());
                    }
                }

                if ($col == 0) {
                    $no = $val;
                }
                if ($col == 1) {
                    $jammasuk = $val;
                }
                if ($col == 2) {
                    $jamkeluar = $val;
                }
                if ($col == 3) {
                    $nopol = $val;
                }
                if ($col == 4) {
                    $lpsdepo = $val;
                }
                if ($col == 5) {
                    $truk = $val;
                }
                if ($col == 6) {
                    if (trim($val) == "") {
                        $val = 0;
                    }
                    $beratkotor = preg_replace('/[^0-9]/', '', $val);
                    $beratkotor = str_replace("'", "", $val);
                }
                if ($col == 7) {
                    if (trim($val) == "") {
                        $val = 0;
                    }
                    $beratkosong = preg_replace('/[^0-9]/', '', $val);
                    $beratkosong = str_replace("'", "", $val);
                }
                if ($col == 8) {
                    if (trim($val) == "") {
                        $val = 0;
                    }
                    $beratbersih = preg_replace('/[^0-9]/', '', $val);
                    $beratbersih = str_replace("'", "", $val);
                }

                if ($f1 && $no != "" && $jammasuk != "" && $jamkeluar != "" && $nopol != "" && $lpsdepo != "" && $truk != "" && $beratkotor != "" && $beratkosong != "" && $beratbersih != "") {
                    $f2 = true;
                }
            }
        }

        if ($f1 && $f2) {
            /*
              echo "no : " . $no;
              echo "\n";
              echo "jammasuk : " . $jammasuk;
              echo "\n";
              echo "jamkeluar : " . $jamkeluar;
              echo "\n";
              echo "nopol : " . $nopol;
              echo "\n";
              echo "lpsdepo : " . $lpsdepo;
              echo "\n";
              echo "truk : " . $truk;
              echo "\n";
              echo "beratkotor : " . $beratkotor;
              echo "\n";
              echo "beratkosong : " . $beratkosong;
              echo "\n";
              echo "beratbersih : " . $beratbersih;
              echo "\n";
              echo "\n";
             */

            $qinsert = "insert into sampahmasuktpa (tgltitle, tgl, nopol, lpsdepo, trukasal, bkotor, bkosong, bbersih) values ('" . $tgltitle . "', " . $sheetname . ", '" . addslashes($nopol) . "','" . addslashes($lpsdepo) . "','" . addslashes($truk) . "' , $beratkotor , $beratkosong , $beratbersih)";

            /*
              $qinsert = "insert into sampahmasuktpa (tgl, nopol, lpsdepo, trukasal, bkotor, bkosong, bbersih) values ( " . $sheetname . ", '" . addslashes($nopol) . "','" . addslashes($lpsdepo) . "','" . addslashes($truk) . "',replace($beratkotor,'''',''),replace($beratkosong,'''',''),replace($beratbersih,'''',''))";
             * 
             */

            mysql_query($qinsert) or die(mysql_error() . "<br><br>" . $qinsert);
        }
    }
    /*
      echo "\n";
      echo "\n";
      echo "\n";
     * 
     */
}
/*
  echo "\n";
  echo "Import excel finish...";
 * 
 */

$q_berat_bersih_per_lps = mysql_query("select lpsdepo, sum(bbersih) as berat_bersih_per_lps from sampahmasuktpa group by lpsdepo");

?>
<!--
<h4>Tonase Total untuk Tiap Depo LPS dalam Satu Bulan</h4>
<table>
    <tr>
        <th>Depo LPS</th>
        <th>Tonase Total</th>
    </tr>
    <?php
    //while ($row = mysql_fetch_array($q_berat_bersih_per_lps)) {
        ?>
        <tr>
            <td><?php //echo $row['lpsdepo']; ?></td>
            <td><?php //echo $row['berat_bersih_per_lps']; ?></td>
        </tr>
        <?php
    //}
    ?>       
</table>
<br>
-->
