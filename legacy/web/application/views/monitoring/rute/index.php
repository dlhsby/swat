<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<legend>Monitoring Rute SWAT</legend>
<div class="grid fluid">
    <!--overview hari ini-->
    <div class="row">
        <div class="col-md-9">
            <section class="panel">
                <header class="panel-heading">
                    Rute Terakhir Seluruh Kendaraan
                        <!--<span class="tools pull-right">
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
                                <th class="hidden-phone">Waktu</th>
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
                                <th class="hidden-phone">Waktu</th>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </section>
        </div>
		<div class="col-md-3">
            <section class="panel">
                <div class="panel-body">
                    <div class="top-stats-panel">
                        <div class="widget-h">Kendaraan aktif hari ini</div>
                        <div class="bar-stats">
                            <ul id="totalJenisKendaraanAktif">

                            </ul>
                            <div class="daily-sales-info" id="totalKendaraanAktif">

                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
    <div class="row">
        <div class="col-md-9">
            <section class="panel">
                <header class="panel-heading">
                    Peta Surabaya
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
	
	//loadTotalBahanBakar();
	//loadTonaseLimaHariTPS();
	//loadTotalJenisSampah();
	loadTotalJenisKendaraanAktif();
	//loadSelisihTonase();
	loadAllRute();
	//loadPenggunaanBahanBakar();
	google.maps.event.addDomListener(window, 'load', loadMap);
});
</script>