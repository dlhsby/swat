<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<legend>Monitoring Tonase Swasta</legend>
<div class="grid fluid">
	<div class="row">
		<div id="containerTanggal" class="col-sm-4" >
            Tanggal Monitoring:
            <div class="input-control text" style="width: 150px">
                <input type="text" name="tanggalMonitoring" id="tanggalMonitoring"/>
                <span id="image_button_tanggalMonitoring" class="btn-date"></span>
            </div>
        </div>
		<button class="large primary btnLoadMonitoring" type="submit" id="btnLoadMonitoring">Lihat Monitoring</button>
	</div>
    <!--overview hari ini-->
    <div class="row">
        <!--gauge bensin-->
        <div class="col-md-4">
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
        <div class="col-md-4">
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
        <div class="col-md-4">
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

				<div class="col-md-12">
					<section class="panel">
										<header class="panel-heading">
												Total Retribusi
										</header>
										<div class="panel-body">
												<div id="TotalRetribusi"></div>
										</div>
								</section>
				</div>

    </div>


		<button type="button" class="btn btn-primary next" id="next">Selanjutnya</button>

		<div class="collapse">
				<div class="col-sm-6">
						<section class="panel">
								<header class="panel-heading">
										Total Tonase 5 Hari Terakhir
								</header>
								<div class="panel-body">
										<div id="tonaseLimaHariTotal"></div>
								</div>
						</section>
				</div>

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
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-tonase-swasta.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-rute-swasta.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-retribusi.js" ?>></script>
<script type="text/javascript">
$(document).ready(function () {
	$(".collapse").collapse({toggle:false});
	$(".next").click(function(){
			$(".collapse").collapse('show');
	});

	var date = new Date();
	var tanggal = date.getFullYear() +'-'+ ("0" + (date.getMonth() + 1)).slice(-2) +'-'+ ("0" + date.getDate()).slice(-2);
	/*var tanggal = '2017-07-23';*/

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
		/*loadTotalTonaseLimaHari(tanggal);
		loadTotalTonaseSatuBulan(tanggal);*/
		loadTotalJenisSampah(tanggal);
		loadSelisihTonase(tanggal);
		loadTotalJenisKendaraanAktif(tanggal);
		loadRetribusi(tanggal);
		google.maps.event.addDomListener(window, 'load', loadMap);
	}

	function updateMonitoring(tanggal){
		updateTotalJenisSampah(tanggal);
		updateSelisihTonase(tanggal);
		updateTotalJenisKendaraanAktif(tanggal);
		updateRetribusi(tanggal);
	}

	function nextUpdateMonitoring(tanggal)
	{
		updateTotalTonaseLimaHari(tanggal);
		updateTotalTonaseSatuBulan(tanggal);
		updateAllRute(tanggal);
	}

	loadMonitoring(tanggal);

	$(".btnLoadMonitoring").click(function(){
		$(".collapse").collapse('hide');
		tanggal = $("#tanggalMonitoring").val();
		console.log(tanggal);
		updateMonitoring(tanggal);
	});


		$("#next").click(function(){
			tanggal = $("#tanggalMonitoring").val();
			console.log(tanggal);
			nextUpdateMonitoring(tanggal);
		});

});
</script>
