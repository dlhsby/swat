<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<legend>Monitoring SWAT</legend>
<div class="grid fluid">
	<div class="row">
		<div id="containerTanggal" class="col-sm-6" >
            Tanggal Monitoring:
            <div class="input-control text" style="width: 150px">
                <input type="text" name="tanggalMonitoring" id="tanggalMonitoring"/>
                <span id="image_button_tanggalMonitoring" class="btn-date"></span>
            </div>
            <button class="large primary" type="submit" id="btnLoadMonitoring">Lihat Monitoring</button>
        </div>
		<div id="containerTanggal" class="col-sm-5 col-sm-offset-1" >
			<h5>Detail Tonase Tahun 2016<a href="http://dkp.surabaya.go.id/swat/index.php/laporan/tonase"> Lihat Detail</a></h5> 
			
        </div>
	</div>
    <!--overview hari ini-->
    <div class="row">
        <!--gauge bensin-->
        <div class="col-md-3">
            <section class="panel">
                <div class="panel-body">
                    <div class="top-stats-panel">
                        <div class="gauge-canvas">
                            <div class="widget-h">Penggunaan Bahan Bakar Hari Ini</div>
                            <canvas width=160 height=100 id="bahanbakarHariIni"></canvas>
                        </div>
                        <ul class="gauge-meta clearfix">
                            <li id="gauge-textfield" class="pull-left gauge-value"></li>
                            <li class="pull-right gauge-title">Liter</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
        <div class="col-md-3">
            <section class="panel">
                <div class="panel-body">
                    <div class="top-stats-panel">
                        <div class="daily-visit">
                            <div class="widget-h">Sampah Masuk Hari Ini</div>
                            <div class="mini-stat clearfix">
                                <div class="mini-stat-info" >
                                    <span id="tonaseHariIni"></span>
                                </div>

                            </div>
                            <ul class="chart-meta clearfix">
                                <li class="pull-left visit-chart-value" id="selisihTonase"></li>
                                <li class="pull-right visit-chart-title" id="persentaseSelisihTonase"></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        <div class="col-md-3">
            <section class="panel">
                <div class="panel-body">
                    <div class="top-stats-panel">
                        <div class="widget-h">Jenis Angkutan Sampah</div>
                        <div id="pie-chart-donut" class="pie-chart">
                            <div id="pie-donutContainer" style="width: 100%;height:150px; text-align: left;">
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
        <div class="col-md-3">
            <section class="panel">
                <div class="panel-body">
                    <div class="top-stats-panel">
                        <div class="widget-h">Kendaraan aktif hari ini</div>
                        <div >
                            <ol id="totalJenisKendaraanAktif" class="list-group">

                            </ol>
                            <div class="daily-sales-info" id="totalKendaraanAktif">

                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <div class="row">
        <div class="col-md-7">
            <!--tonase graph start-->
            <section class="panel">
                <header class="panel-heading">Tonase Lima TPS terbesar
                       <!-- <span class="tools pull-right">
                        <a href="javascript:;" class="fa fa-chevron-down"></a>
                        <a href="javascript:;" class="fa fa-cog"></a>
                        <a href="javascript:;" class="fa fa-times"></a>
                        </span>-->
                </header>
                <div class="panel-body">
                    <div id="tonaseLimaHariTPS" class="main-chart">
                    </div>
                </div>
            </section>
            <!--tonase graph end-->
        </div>
        <div class="col-sm-5">
            <section class="panel">
                <header class="panel-heading">
                    Total Tonase 5 Hari Terakhir
                </header>
                <div class="panel-body">
                    <div id="tonaseLimaHariTotal"></div>
                </div>
            </section>
        </div>
    </div>
	<div class="row">
		<div class="col-md-6">
			<section class="panel">
                <header class="panel-heading">
                    Total Tonase Satu Bulan
                </header>
                <div class="panel-body">
                    <div id="tonaseSatuBulanTotal"></div>
                </div>
            </section>
		</div>
		<div class="col-md-6">
			<section class="panel">
                <header class="panel-heading">
                    Total Bahan Bakar Satu Bulan
                </header>
                <div class="panel-body">
                    <div id="bahanBakarSatuBulanTotal"></div>
                </div>
            </section>
		</div>
	</div>
    <div class="row">
        <div class="col-md-12">
            <section class="panel">
                <header class="panel-heading">
                    Total Tonase Satu Bulan Per Kategori Sumber Sampah
                </header>
                <div class="panel-body">
                    <div id="tonaseSatuBulanTotalPerKategoriSumberSampah"></div>
                </div>
            </section>
        </div>
    </div>
    <div class="row">
        <div class="col-md-12">
            <section class="panel">
                <header class="panel-heading">
                    Rute Terakhir Seluruh Kendaraan
                      <!--  <span class="tools pull-right">
                            <a href="javascript:;" class="fa fa-chevron-down"></a>
                            <a href="javascript:;" class="fa fa-cog"></a>
                            <a href="javascript:;" class="fa fa-times"></a>
                         </span>-->
                </header>
                <div class="panel-body">
                    <div class="adv-table">
                        <table class="display table table-bordered table-striped" id="ruteIndex">
                            <thead>
                            <tr>
                                <th>Nomor Polisi</th>
                                <th>Nama Supir</th>
                                <th>Rute Asal</th>
                                <th>Rute Tujuan</th>
                                <th class="hidden-phone">Waktu Berangkat</th>
								<th class="hidden-phone">Waktu Target</th>
								<th>Lapor</th>
                            </tr>
                            </thead>
                            <tbody id="tabelRute">
                            </tbody>
                            <tfoot>
                            <tr>
                                <th>Nomor Polisi</th>
                                <th>Nama Supir</th>
                                <th>Rute Asal</th>
                                <th>Rute Tujuan</th>
                                <th class="hidden-phone">Waktu Berangkat</th>
								<th class="hidden-phone">Waktu Target</th>
								<th>Lapor</th>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    </div>
    <div class="row">












<div class="col-md-9">
            <section class="panel">
                <header class="panel-heading">
                    Peta Surabaya <strong>(KLIK NOPOL PADA TABEL DI ATAS UNTUK MELIHAT RUTE)</strong>
                        <!--<span class="tools pull-right">
                            <a href="javascript:;" class="fa fa-chevron-down"></a>
                            <a href="javascript:;" class="fa fa-cog"></a>
                            <a href="javascript:;" class="fa fa-times"></a>
                         </span>-->
                </header>
                <div class="panel-body" >
                    <h3 id="estimasiWaktu"></h3>
                    <div id="petaSurabaya" style="height: 500px;"></div>
                </div>
            </section>
        </div>





















        
        <div class="col-md-3">
            <div class="mini-stat clearfix">
                <span class="mini-stat-icon pink"><i class="fa fa-tags"></i></span>
                <div class="mini-stat-info">
                    <span id="detailNopol"></span>
                    Nomor Polisi Kendaraan
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="mini-stat clearfix">
                <span class="mini-stat-icon green"><i class="fa fa-road"></i></span>
                <div class="mini-stat-info">
                    <span id="detailJarak"></span>
                    Estimasi Jarak Ditempuh
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="mini-stat clearfix">
                <span class="mini-stat-icon tar"><i class="fa fa-truck"></i></span>
                <div class="mini-stat-info">
                    <span id="detailWaktuBerangkat"></span>
                    Estimasi Waktu Berangkat
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="mini-stat clearfix">
                <span class="mini-stat-icon orange"><i class="fa fa-clock-o"></i></span>
                <div class="mini-stat-info">
                    <span id="detailWaktuSampai"></span>
                    Estimasi Waktu Sampai
                </div>
            </div>
        </div>
		<div id="divDetailWaktuSampaiTPA" class="col-md-3 hidden">
            <div class="mini-stat clearfix">
                <span class="mini-stat-icon orange"><i class="fa fa-clock-o"></i></span>
                <div class="mini-stat-info">
                    <span id="detailWaktuSampaiTPA"></span>
                    Estimasi Waktu Sampai TPA
                </div>
            </div>
        </div>
    </div>
</div>
<script src=<?php echo base_url() . "assets/js/gauge/gauge.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/morris-chart/morris.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/morris-chart/raphael-min.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/advanced-datatable/js/jquery.dataTables.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/data-tables/DT_bootstrap.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.tooltip.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.resize.js" ?>></script>
<script src=<?php echo base_url() . "assets/js/flot/jquery.flot.pie.js" ?>></script>

<script src="https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&language=id"></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-bahanbakar.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-tonase.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-rute.js" ?>></script>
<script type="text/javascript">
$(document).ready(function () {
	var date = new Date();
	var tanggal = date.getFullYear() +'-'+ ("0" + (date.getMonth() + 1)).slice(-2) +'-'+ ("0" + date.getDate()).slice(-2);
    $('#tanggalMonitoring').datetimepicker({
        mask: '9999-19-39',
        format: 'Y-m-d',
        timepicker: false,
        closeOnDateSelect: true
    });
	$('#image_button_tanggalMonitoring').click(function () {
        $('#tanggalMonitoring').datetimepicker('show'); //support hide,show and destroy command
    });
	$("#tanggalMonitoring").val(tanggal);
	function loadMonitoring(tanggal){
		loadTotalBahanBakar(tanggal);
		loadTotalBahanBakarSatuBulan(tanggal);
		//loadPenggunaanBahanBakar();
		loadTonaseLimaHariTPS(tanggal);
		loadTotalTonaseLimaHari(tanggal);
		loadTotalTonaseSatuBulan(tanggal);
        loadTotalTonaseSatuBulanPerKategoriSumberSampah(tanggal);
		loadTotalJenisSampah(tanggal);
		loadSelisihTonase(tanggal);
		loadTotalJenisKendaraanAktif(tanggal);
		loadAllRute(tanggal);
		google.maps.event.addDomListener(window, 'load', loadMap);
	}
	function updateMonitoring(tanggal){
		updateTotalBahanBakar(tanggal);
		updateTotalBahanBakarSatuBulan(tanggal);
		updateTotalJenisSampah(tanggal);
		updateSelisihTonase(tanggal);
		updateTonaseLimaTPS(tanggal);
		updateTotalTonaseLimaHari(tanggal);
		updateTotalTonaseSatuBulan(tanggal);
        updateTotalTonaseSatuBulanPerKategoriSumberSampah(tanggal);
		updateTotalJenisKendaraanAktif(tanggal);
		updateAllRute(tanggal);
	}
	loadMonitoring(tanggal);
	$("#btnLoadMonitoring").click(function(){
		tanggal = $("#tanggalMonitoring").val();
		console.log(tanggal);
		updateMonitoring(tanggal);
	});
});
</script>
