<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Tonase extends CI_Controller{
	public function __construct() {
		parent::__construct();
	}

    public function cetaklaporantonasetanggal(){
		/*$tanggal = $this->input->get('tanggal');*/
		$bulan = $this->input->get('bulan');
		$tahun = $this->input->get('tahun');
		$tanggal = $bulan .'-'.$tahun;

		$this->load->model('model_laporantonasesampah');
        $this->load->library('excel');

		$result = $this->model_laporantonasesampah->get_laporan_tonase_by_tanggal($tanggal,$bulan,$tahun);
		$this->excel->createSheet(0);
		$this->excel->setActiveSheetIndex(0);
		//name the worksheet
		$this->excel->getActiveSheet()->setTitle($tanggal);
		//set cell A1 content with some text
		$this->excel->getActiveSheet()->setCellValue('A1', 'LAPORAN HASIL ENTRI TONASE');
		//change the font size
		$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setSize(16);
		//make the font become bold
		//$this->excel->getActiveSheet()->getStyle('A1')->getFont()->setBold(true);
		//merge cell A1 until D1
		$this->excel->getActiveSheet()->mergeCells('A1:I1');
		//set aligment to center for that merged cell (A1 to D1)
		$this->excel->getActiveSheet()->getStyle('A1')->getAlignment()->setHorizontal(PHPExcel_Style_Alignment::HORIZONTAL_CENTER);
		$this->excel->getActiveSheet()->setCellValue('A3', 'Bulan '.$bulan.' Tahun '.$tahun);
		$header = 5; //set baris header
		$this->excel->getActiveSheet()->setCellValue('A'.$header,'NOMOR');
		$this->excel->getActiveSheet()->setCellValue('B'.$header,'NOMOR POLISI KENDARAAN');
		$this->excel->getActiveSheet()->setCellValue('C'.$header,'MERK KENDARAAN');
		$this->excel->getActiveSheet()->setCellValue('D'.$header,'APLIKASI KENDARAAN');
		$this->excel->getActiveSheet()->setCellValue('E'.$header,'ASAL TPS');
		$this->excel->getActiveSheet()->setCellValue('F'.$header,'KM REALISASI');
		$this->excel->getActiveSheet()->setCellValue('G'.$header,'WAKTU REALISASI');
		$this->excel->getActiveSheet()->setCellValue('H'.$header,'WAKTU ENTRI');
		$this->excel->getActiveSheet()->setCellValue('I'.$header,'BERAT BERSIH SAMPAH');
		$awal = 6; $i = $awal; $nomor = 1;
		if($result->num_rows()>0){
			foreach($result->result() as $data){
				$this->excel->getActiveSheet()->setCellValue('A'.$i,$nomor);
				$this->excel->getActiveSheet()->setCellValue('B'.$i,$data->KENDARAAN_NOMORPOLISI);
				$this->excel->getActiveSheet()->setCellValue('C'.$i,$data->KATEGORIKENDARAAN_MERK);
				$this->excel->getActiveSheet()->setCellValue('D'.$i,$data->APLIKASIKENDARAAN_NAMA);
				$this->excel->getActiveSheet()->setCellValue('E'.$i,$data->SPOT_ASAL_NAMA);
				$this->excel->getActiveSheet()->setCellValue('F'.$i,$data->TRAYEK_KMREALISASI);
				$this->excel->getActiveSheet()->setCellValue('G'.$i,$data->TRAYEK_WAKTUREALISASI);
				$this->excel->getActiveSheet()->setCellValue('H'.$i,$data->TRAYEK_WAKTUENTRIREALISASI);
				$this->excel->getActiveSheet()->setCellValue('I'.$i,$data->TRAYEK_BERATBERSIHSAMPAH);
				$i++;
				$nomor++;
			}
			$this->excel->getActiveSheet()->setCellValue('H'.($i),'TOTAL');
			$this->excel->getActiveSheet()->setCellValue('I'.($i),'=SUM(I'.$awal.':I'.($i-1).')');
		}
		$this->excel->getActiveSheet()->setCellValue('A'.($i+3),'SURABAYA, '.$tanggal);
		$this->excel->getActiveSheet()->setCellValue('A'.($i+6),'PARAF PETUGAS');

		foreach(range('B','J') as $columnID) {
			$this->excel->getActiveSheet()->getColumnDimension($columnID)->setAutoSize(true);
		}


	$filename='laporan_tonase_tanggal_'.$tanggal.'.xls'; //save our workbook as this file name
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
