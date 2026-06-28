<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Bahanbakar extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

    public function cetaklaporanbahanbakartanggal(){
		$tanggal = $this->input->get('tanggal');
		$awal = $this->input->get('awal');
		$akhir = $this->input->get('akhir');
		$this->load->model('model_laporanbahanbakar');
		$dua = FALSE;
		$result = NULL;
		$jenis = NULL;
		if($awal!=NULL and $akhir!=NULL and $awal!=$akhir ){
			$dua = TRUE;
			$jenis = $this->model_laporanbahanbakar->get_jenis_bahan_bakar_by_dua_tanggal($awal,$akhir);
			$arr = explode(" ",$akhir);
			$tanggal = $arr[0];
		}
		else{
			$jenis = $this->model_laporanbahanbakar->get_jenis_bahan_bakar_by_tanggal($tanggal);
		}
        $this->load->library('excel');
		//activate worksheet number 1
		$n = 0;
		foreach($jenis->result() as $jenisbbm){
			$result = ($dua)?$this->model_laporanbahanbakar->get_laporan_bahan_bakar_by_dua_tanggal($awal,$akhir,$jenisbbm->BAHANBAKAR_NAMA):$this->model_laporanbahanbakar->get_laporan_bahan_bakar_by_tanggal($tanggal,$jenisbbm->BAHANBAKAR_NAMA);
			$this->excel->createSheet($n);
			$this->excel->setActiveSheetIndex($n);
			//name the worksheet
			$this->excel->getActiveSheet()->setTitle($jenisbbm->BAHANBAKAR_NAMA);
			//set cell A1 content with some text
			$this->excel->getActiveSheet()->setCellValue('A1', 'LAPORAN HASIL ENTRI BAHAN BAKAR');
			//change the font size
			$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setSize(16);
			//make the font become bold
			//$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setBold(true);
			//merge cell A1 until D1
			$this->excel->getActiveSheet()->mergeCells('A1:J1');
			//set aligment to center for that merged cell (A1 to D1)
			$this->excel->getActiveSheet()->getStyle('A1')->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
			if($dua)$this->excel->getActiveSheet()->setCellValue('A3', 'data tanggal '.$awal.' sampai dengan '.$akhir);
			else $this->excel->getActiveSheet()->setCellValue('A3', 'data tanggal '.$tanggal);
			$header = 5; //set baris header
			$this->excel->getActiveSheet()->setCellValue('A'.$header,'NOMOR');
			$this->excel->getActiveSheet()->setCellValue('B'.$header,'NOMOR POLISI KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('C'.$header,'MERK KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('D'.$header,'APLIKASI KENDARAAN');
			$this->excel->getActiveSheet()->setCellValue('E'.$header,'JENIS BAHAN BAKAR');
			$this->excel->getActiveSheet()->setCellValue('F'.$header,'KM REALISASI');
			$this->excel->getActiveSheet()->setCellValue('G'.$header,'WAKTU REALISASI');
			$this->excel->getActiveSheet()->setCellValue('H'.$header,'WAKTU ENTRI');
			$this->excel->getActiveSheet()->setCellValue('I'.$header,'BAHAN BAKAR DIAJUKAN');
			$this->excel->getActiveSheet()->setCellValue('J'.$header,'BAHAN BAKAR DISETUJUI');
			$indexawal = 6; $i = $indexawal; $nomor = 1;
			if($result->num_rows()>0){
				foreach($result->result() as $data){
					$this->excel->getActiveSheet()->setCellValue('A'.$i,$nomor);
					$this->excel->getActiveSheet()->setCellValue('B'.$i,$data->KENDARAAN_NOMORPOLISI);
					$this->excel->getActiveSheet()->setCellValue('C'.$i,$data->KATEGORIKENDARAAN_MERK);
					$this->excel->getActiveSheet()->setCellValue('D'.$i,$data->APLIKASIKENDARAAN_NAMA);
					$this->excel->getActiveSheet()->setCellValue('E'.$i,$data->BAHANBAKAR_NAMA);
					$this->excel->getActiveSheet()->setCellValue('F'.$i,$data->TRAYEK_KMREALISASI);
					$this->excel->getActiveSheet()->setCellValue('G'.$i,$data->TRAYEK_WAKTUREALISASI);
					$this->excel->getActiveSheet()->setCellValue('H'.$i,$data->TRAYEK_WAKTUENTRIREALISASI);
					$this->excel->getActiveSheet()->setCellValue('I'.$i,$data->TRAYEK_JUMLAHISIBBMDIAJUKAN);
					$this->excel->getActiveSheet()->setCellValue('J'.$i,$data->TRAYEK_JUMLAHISIBBMDISETUJUI);
					$i++;
					$nomor++;
				}
				$this->excel->getActiveSheet()->setCellValue('H'.($i),'TOTAL');
				$this->excel->getActiveSheet()->setCellValue('I'.($i),'=SUM(I'.$indexawal.':I'.($i-1).')');
				$this->excel->getActiveSheet()->setCellValue('J'.($i),'=SUM(J'.$indexawal.':J'.($i-1).')');
			}
			$this->excel->getActiveSheet()->setCellValue('A'.($i+3),'SURABAYA, '.$tanggal);
			$this->excel->getActiveSheet()->setCellValue('A'.($i+6),'PARAF PETUGAS');
			
			foreach(range('B','J') as $columnID) {
			    $this->excel->getActiveSheet()->getColumnDimension($columnID)->setAutoSize(true);
			}
			$n++;
		}
		
	 
	$filename='laporan_bahan_bakar_tanggal_'.$tanggal.'.xls'; //save our workbook as this file name
	header('Content-Type: application/vnd.ms-excel'); //mime type
	header('Content-Disposition: attachment;filename="'.$filename.'"'); //tell browser what's the file name
	header('Cache-Control: max-age=0'); //no cache
	             
	//save it to Excel5 format (excel 2003 .XLS file), change this to 'Excel2007' (and adjust the filename extension, also the header mime type)
	//if you want to save it as .XLSX Excel 2007 format
	$objWriter = PHPExcel_IOFactory::createWriter($this->excel, 'Excel5');  
	//force user to download the Excel file without writing it to server's HD
	$objWriter->save('php://output');
    }
}
?>