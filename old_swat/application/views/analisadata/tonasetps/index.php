<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<nav class="breadcrumbs">
    <ul>
        <li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li class="active"><a href="<?php echo base_url().'index.php/analisadata/tonasetps'; ?>">Rekapitulasi</a></li>
    </ul>
</nav>
</br>
<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>

<link rel="stylesheet" href="<?php echo base_url() ?>assets/css/flexselect.css" type="text/css" media="screen" />
<script src="<?php echo base_url() ?>assets/js/liquidmetal.js" type="text/javascript"></script>
<script src="<?php echo base_url() ?>assets/js/jquery.flexselect.js" type="text/javascript"></script>

<script type="text/javascript">
    $(document).ready(function () {

        $("select.special-flexselect").flexselect({ hideDropdownOnEmptyInput: true });
        $("select.flexselect").flexselect();
        $("input:text:enabled:first").focus();

        var base_url = "<?php echo base_url() ?>";
        var cachedPengemudiOptions = null;
        var cachedSimOptions = null;
        $('#daritanggalTransaksi').datetimepicker({
            mask: '39-19-9999',
            format: 'd-m-Y',
            timepicker: false,
            closeOnDateSelect: true
        });
        $('#image_button_daritanggalTransaksi').click(function () {
            $('#daritanggalTransaksi').datetimepicker('show'); //support hide,show and destroy command
        });
        $('#sampaitanggalTransaksi').datetimepicker({
            mask: '39-19-9999',
            format: 'd-m-Y',
            timepicker: false,
            closeOnDateSelect: true
        });
        $('#image_button_sampaitanggalTransaksi').click(function () {
            $('#sampaitanggalTransaksi').datetimepicker('show'); //support hide,show and destroy command
        });
        $('#TonaseTPSContainer').jtable({
            title: 'Volume TPS',
            paging: true,
            pageSize: 10,
            sorting: true,
            defaultSorting: 'KATEGORISUMBERSAMPAH_KODE ASC',
            columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url + 'index.php/analisadata/tonasetps/getlist'
                /*
                listAction: base_url+'index.php/masterdata/kepemilikansim/getkepemilikansim',
                createAction: base_url+'index.php/masterdata/kepemilikansim/createkepemilikansim',
                updateAction: base_url+'index.php/masterdata/kepemilikansim/updatekepemilikansim',
                deleteAction: base_url+'index.php/masterdata/kepemilikansim/deletekepemilikansim'
                */
            },
            fields: {			    
                SPOT_NAMA: {
                    key: true,
                    title: 'Nama TPS',
                    create: false
                },
                Tanggal: {
                    title: 'Tanggal',
                    create: false
                },
                Tonase_Total: {
                    title: 'Volume Total (Ton)',
                    create: false
				},	
				KENDARAAN_ID: {
					title: 'Nopol Kendaraan',
					create: false
                },
            },
            formCreated: function (event, data2) {

            }
        });
        $('#TonaseTPSContainer').jtable('load');
        $('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
            var namaTPS = encodeURI($("#tpsList option:selected").text());
            console.log("Tanggal Dari: " + $('#daritanggalTransaksi').val() + " , Tanggal Sampai: " + $('#sampaitanggalTransaksi').val());
            $('#TonaseTPSContainer').jtable('load', {
                daritanggalTransaksi: $('#daritanggalTransaksi').val(),
                sampaitanggalTransaksi: $('#sampaitanggalTransaksi').val(),
                namaTPS: namaTPS
            });
			$.ajax({
                type: 'post',
                url: base_url + 'index.php/analisadata/tonasetps/getjumlahtotal',
                async: true,
                data: {
                    daritanggalTransaksi: $('#daritanggalTransaksi').val(),
                    sampaitanggalTransaksi: $('#sampaitanggalTransaksi').val(),
                    namaTPS: namaTPS
                },
                beforeSend: function () {
                },
                success: function (data) {
                    $('#totaltonase').html(data);
                },
                error: function (xhr, textStatus, error) {
                },
                timeout: 3600000
            });
        });
    });
</script>
<legend>Data Volume TPS</legend>
<div class="filtering">
    <form>
        <table width="100%" align="center">
            <tr valign="middle">
                <td width="20%" align="right">Dari Tanggal</td>
                <td width="2%" align="center">:</td>
                <td width="20%" align="left" valign="middle">
                    <div class="input-control text" style="width: 150px">
                        <input type="text" name="daritanggalTransaksi" id="daritanggalTransaksi"
                               value="<?php echo $tanggalDari ?>"/>
                        <span id="image_button_daritanggalTransaksi" class="btn-date"></span>
                    </div>
                </td>

                <td width="20%" align="right">Sampai Tanggal</td>
                <td width="2%" align="center">:</td>
                <td width="20%" align="left" valign="middle">
                    <div class="input-control text" style="width: 150px">
                        <input type="text" name="sampaitanggalTransaksi" id="sampaitanggalTransaksi"
                               value="<?php echo $tanggalSampai ?>"/>
                        <span id="image_button_sampaitanggalTransaksi" class="btn-date"></span>
                    </div>
                </td>

                <td width="10%" align="right">TPS</td>
                <td width="2%" align="center">:</td>
                <td width="20%" align="left">
                    <div class="input-control select" style="width: 230px">
                        <select class="special-flexselect" id="tpsList" name="tpsList" tabindex="1" data-placeholder="Cari TPS...">
                            <?php
                            foreach ($all_TPS->result() as $row) {
                                echo '<option value="' . $row->SPOT_ID . '">' . $row->SPOT_NAMA. '</option>';
                            }
                            ?>
                        </select>
                    </div>
                </td>
            </tr>
            <tr valign="middle">
                <td></td>
                <td></td>
                <td colspan="3">
                    <button class="primary large" type="submit" id="LoadRecordsButton">Load records</button>
                </td>
            </tr>
        </table>
    </form>
</div>
<div id="TonaseTPSContainer"></div>
<legend>
    <div style="color:black; font-size:65%" id="totaltonase">Total Tonase : <?php echo $total_tonase; ?></div>
</legend>
<br>