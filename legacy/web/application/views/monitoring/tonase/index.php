<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<legend>Monitoring Tonase SWAT</legend>
<div class="grid fluid">
    <!--overview hari ini-->
    <div class="row">
        <!--gauge bensin-->

        <div class="col-md-6">
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
        <div class="col-md-6">
            <section class="panel">
                <div class="panel-body">
                    <div class="top-stats-panel">
                        <div class="widget-h">Jenis Sampah Masuk</div>
                        <div id="pie-chart-donut" class="pie-chart">
                            <div id="pie-donutContainer" style="width: 100%;height:150px; text-align: left;">
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
                            <!--<span class="tools pull-right">
                                <a href="javascript:;" class="fa fa-chevron-down"></a>
                                <a href="javascript:;" class="fa fa-cog"></a>
                                <a href="javascript:;" class="fa fa-times"></a>
                             </span>-->
                </header>
                <div class="panel-body">
                    <div id="tonaseLimaHariTotal"></div>
                </div>
            </section>
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
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-tonase-semua.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-rute-semua.js" ?>></script>
<script type="text/javascript">
$(document).ready(function () {

	//loadTotalBahanBakar();
	loadTonaseLimaHariTPS();
	loadTotalJenisSampah();
	loadTotalJenisKendaraanAktif();
	loadSelisihTonase();
	//loadAllRute();
	//loadPenggunaanBahanBakar();
	//google.maps.event.addDomListener(window, 'load', loadMap);
});
</script>
