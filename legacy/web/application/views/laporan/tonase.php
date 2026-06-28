<?php

date_default_timezone_set('Asia/Jakarta');
$this->fpdf->FPDF("L","cm","A4");

$this->fpdf->SetMargins(1,1,1);


$this->fpdf->AliasNbPages();

// AddPage merupakan fungsi untuk membuat halaman baru
$this->fpdf->AddPage();

/*variable declaration*/ 
$todayDate = indonesian_date ($tanggalHariIni, 'j F Y',"");;
$recentPageNumber = 0;

/*End of variable declaration*/ 

/* Header */
$this->fpdf->SetY(1);
$this->fpdf->SetFont('Times',"",10);
$this->fpdf->Cell(0, 0.5, 'Laporan Pembuangan Sampah TPA Benowo '.$todayDate,0,'LR','R');
/* End of Header */

$this->fpdf->Ln(1);
$this->fpdf->SetFont('Times','B',16);
$this->fpdf->Cell(0,0.7,'LAPORAN PEMBUANGAN TPA BENOWO TANGGAL '.$todayDate,0,0,'C');

/* generate hasil query disini */
$this->fpdf->Ln(1);
$this->fpdf->SetFont('Times','B',12);
$this->fpdf->Cell(1, 1, 'No.' , 1, 0, 'C');
$this->fpdf->Cell(3.8 , 1, 'Waktu Pembuangan' , 1, 0, 'C');
$this->fpdf->Cell(2 , 1, 'Nopol' , 1, 0, 'C');
$this->fpdf->Cell(6 , 1, 'TPS' , 1, 0, 'C');
$this->fpdf->Cell(2.7 , 1, 'Berat Kosong' , 1, 0, 'C');
$this->fpdf->Cell(2.5 , 1, 'Berat Kotor' , 1, 0, 'C');
$this->fpdf->Cell(2.5 , 1, 'Berat Bersih' , 1, 0, 'C');
$this->fpdf->Cell(3.5 , 1, 'Pengentri' , 1, 0, 'C');
$this->fpdf->Cell(4 , 1, 'Keterangan' , 1, 0, 'C');
$totalTonase = 0;
foreach($result->result() as $data)
{	
	$this->fpdf->Ln();
	$this->fpdf->SetFont('Times',"",10);
	$this->fpdf->Cell(1 , 0.7, $data->URUTANPEMBUANGAN, 1, 0, 'C');
	$this->fpdf->Cell(3.8 , 0.7, date('h:m:s', strtotime($data->TRAYEK_WAKTUREALISASI)) , 1, 0, 'C');
	$this->fpdf->Cell(2 , 0.7, $data->KENDARAAN_NOMORPOLISI , 1, 0, 'C');
	$this->fpdf->Cell(6 , 0.7, $data->SPOT_ASAL_NAMA , 1, 0, 'C');
	$this->fpdf->Cell(2.7 , 0.7, number_format($data->TRAYEK_BERATKOSONGKENDARAAN,0,',','.') , 1, 0, 'R');
	$this->fpdf->Cell(2.5 , 0.7, number_format($data->TRAYEK_BERATKOTORTIMBANGAN,0,',','.') , 1, 0, 'R');
	$this->fpdf->Cell(2.5 , 0.7, number_format($data->TRAYEK_BERATBERSIHSAMPAH,0,',','.') , 1, 0, 'R');	
	$this->fpdf->Cell(3.5 , 0.7, $data->PENGGUNA_NAMA , 1, 0, 'C');
	$this->fpdf->Cell(4 , 0.7, $data->TRAYEK_KETERANGAN , 1, 0, 'C');
	$totalTonase = $totalTonase + $data->TRAYEK_BERATBERSIHSAMPAH;
	if($this->fpdf->GetY()>17){
		/* setting header table */
		$this->fpdf->Ln(1);
		$this->fpdf->SetFont('Times','B',12);
		$this->fpdf->Cell(1, 1, 'No.' , 1, 0, 'C');
		$this->fpdf->Cell(3.8 , 1, 'Waktu Pembuangan' , 1, 0, 'C');
		$this->fpdf->Cell(2 , 1, 'Nopol' , 1, 0, 'C');
		$this->fpdf->Cell(6 , 1, 'TPS' , 1, 0, 'C');
		$this->fpdf->Cell(2.7 , 1, 'Berat Kosong' , 1, 0, 'C');
		$this->fpdf->Cell(2.5 , 1, 'Berat Kotor' , 1, 0, 'C');
		$this->fpdf->Cell(2.5 , 1, 'Berat Bersih' , 1, 0, 'C');
		$this->fpdf->Cell(3.5 , 1, 'Pengentri' , 1, 0, 'C');
		$this->fpdf->Cell(4 , 1, 'Keterangan' , 1, 0, 'C');
		$recentPageNumber++;
	}
	
	
	
}
$this->fpdf->Ln();
$this->fpdf->SetFont('Times',"B",12);
$this->fpdf->Cell(18 , 1, "Jumlah Total" , 0, 0, 'R');
$this->fpdf->Cell(2.5 , 1, number_format($totalTonase,0,',','.') , 1, 0, 'R');
$this->fpdf->Cell(4 , 1, "" , 0, 0, 'L');
$this->fpdf->Cell(3.5 , 1, "" , 0, 0, 'C');


/* Footer*/
$this->fpdf->SetY(-3);
$this->fpdf->SetFont('Times',"",10);
$this->fpdf->Cell(0, 0.5, 'http://localhost:8090/index.php/laporan/tonase/cetaklaporantonasepdf?tanggal='.$tanggalHariIni,0,'LR','L');
$this->fpdf->Cell(0, 0.5, 'Page '.$this->fpdf->PageNo().'/{nb}',0,'LR','R');
/* End Footer*/

/* generate pdf jika semua konstruktor, data yang akan ditampilkan, dll sudah selesai */
$this->fpdf->Output("laporan_tonase_".$tanggalHariIni.".pdf","I");
?>