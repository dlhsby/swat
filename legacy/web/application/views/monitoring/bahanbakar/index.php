<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<legend>Monitoring SWAT</legend>
<div class="grid fluid">
    <!--overview hari ini-->
    <div class="row">
        <!--gauge bensin-->
        <div class="col-md-6">
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
        <div class="col-md-6">
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
        <div class="col-sm-12">
            <section class="panel">
                <header class="panel-heading">
                    Penggunaan Bahan Bakar Kendaraan
                        <!--<span class="tools pull-right">
                            <a href="javascript:;" class="fa fa-chevron-down"></a>
                            <a href="javascript:;" class="fa fa-cog"></a>
                            <a href="javascript:;" class="fa fa-times"></a>
                         </span>-->
                </header>
                <div class="panel-body" >
                    <div class="filtering">
                        <form>
                            <div class="grid fluid">
                                <div class="row">
                                    <div class="col-sm-12">
                                        <div class="col-sm-3">
                                            Waktu :
                                            <div class="input-control select" style="width: 150px">
                                                <select id="jenisWaktu" name="jenisWaktu">
                                                    <option selected="selected" value="0">All Waktu</option>
                                                    <option value="1">Per Bulan</option>
<!--                                                    <option value="2">Per Minggu</option>-->
                                                    <option value="3">Per Tanggal</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div id="containerBulan" class="col-sm-3" style="display: none;">
                                            Bulan :
                                            <div class="input-control text" style="width: 150px">
                                                <input type="text" name="bulanTransaksi" id="bulanTransaksi"/>
                                                <span id="image_button_bulanTransaksi" class="btn-date"></span>
                                            </div>
                                        </div>
                                        <div id="containerMinggu" class="col-sm-3" style="display: none;">
                                            Minggu :
                                            <div class="input-control select" style="width: 150px">
                                                <select id="mingguTransaksi" name="mingguTransaksi">
                                                    <option selected="selected" value="0">All Minggu</option>
                                                    <option value="1">Minggu 1</option>
                                                    <option value="2">Minggu 2</option>
                                                    <option value="3">Minggu 3</option>
                                                    <option value="4">Minggu 4</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div id="containerTanggal" class="col-sm-3" style="display: none;">
                                            Tanggal :
                                            <div class="input-control text" style="width: 150px">
                                                <input type="text" name="tanggalTransaksi" id="tanggalTransaksi"/>
                                                <span id="image_button_tanggalTransaksi" class="btn-date"></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!--<div class="grid fluid">-->
                                <div class="row">
                                    <div class="col-sm-3">
                                        Nopol :
                                        <div class="input-control text" style="width: 150px">
                                            <input type="text" name="nopolKendaraan" id="nopolKendaraan" placeholder="Nopol"/>
                                        </div>
                                    </div>
                                    <div class="col-sm-3">
                                        Aplikasi :
                                        <div class="input-control select" style="width: 150px">
                                            <select id="aplikasiKendaraan" name="aplikasiKendaraan">
                                                <option selected="selected" value="0">All Aplikasi</option>
                                                <?php
/*                                                foreach ($all_aplikasikendaraan->result() as $row) {
                                                    echo '<option value="' . $row->APLIKASIKENDARAAN_NAMA . '">' . $row->APLIKASIKENDARAAN_NAMA . '</option>';
                                                }

                                                */?>
                                            </select>
                                        </div>
                                    </div>
                                    <div id="containerKategoriKendaraan" class="col-sm-3" style="display: none">
                                        Kategori :
                                        <div class="input-control select" style="width: 150px">
                                            <select id="kategoriKendaraan" name="kategoriKendaraan">
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-sm-4">
                                        Bahan Bakar :
                                        <div class="input-control select" style="width: 150px">
                                            <select id="bahanBakar" name="bahanBakar">
                                                <option selected="selected" value="0">All Bahan Bakar</option>
                                                <?php
/*                                                foreach ($all_bahanbakar->result() as $row) {
                                                    echo '<option value="' . $row->BAHANBAKAR_NAMA . '">' . $row->BAHANBAKAR_NAMA . '</option>';
                                                }

                                                */?>
                                            </select>
                                        </div>
                                    </div>
                                </div>
							
                            <button class="large primary" type="submit" id="LoadRecordsButton">Load records</button>
                        </form>
                    </div>
                    <center>
                        <div id="PenggunaanBahanBakarTableContainer" class="col-sm-12"></div>
                    </center>
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
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-tonase.js" ?>></script>
<script type="text/javascript" src=<?php echo base_url() . "assets/js/monitoring-rute.js" ?>></script>
<script type="text/javascript">
$(document).ready(function () {
	
	loadTotalBahanBakar();
	//loadTonaseLimaHariTPS();
	//loadTotalJenisSampah();
	loadTotalJenisKendaraanAktif();
	//loadSelisihTonase();
	//loadAllRute();
	loadPenggunaanBahanBakar();
	//google.maps.event.addDomListener(window, 'load', loadMap);
});
</script>