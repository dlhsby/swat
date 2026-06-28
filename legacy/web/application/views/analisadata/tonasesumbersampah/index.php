<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<nav class="breadcrumbs">
    <ul>
        <li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li class="active"><a href="<?php echo base_url() . 'index.php/analisadata/tonasetps'; ?>">Rekapitulasi</a></li>
    </ul>
</nav>
</br>
<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>
<script type="text/javascript">
    $(document).ready(function () {
        var base_url = "<?php echo base_url() ?>";
        var cachedPengemudiOptions = null;
        var cachedSimOptions = null;
        $('#daritanggalTransaksi').datetimepicker({
            //mask: '9999-19-39',
            //format: 'Y-m-d',
			mask: '39-19-9999',
            format: 'd-m-Y',
            timepicker: false,
            closeOnDateSelect: true
        });
        $('#image_button_daritanggalTransaksi').click(function () {
            $('#daritanggalTransaksi').datetimepicker('show'); //support hide,show and destroy command
        });
        $('#sampaitanggalTransaksi').datetimepicker({
            //mask: '9999-19-39',
            //format: 'Y-m-d',
			mask: '39-19-9999',
            format: 'd-m-Y',
            timepicker: false,
            closeOnDateSelect: true
        });
        $('#image_button_sampaitanggalTransaksi').click(function () {
            $('#sampaitanggalTransaksi').datetimepicker('show'); //support hide,show and destroy command
        });
        $('#TonaseSumberSampahContainer').jtable({
            title: 'Sumber Sampah',
            paging: true,
            pageSize: 10,
            sorting: true,
            defaultSorting: 'KATEGORISUMBERSAMPAH_KODE ASC',
            columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url + 'index.php/analisadata/tonasesumbersampah/getlist'
                /*
                listAction: base_url+'index.php/masterdata/kepemilikansim/getkepemilikansim',
                createAction: base_url+'index.php/masterdata/kepemilikansim/createkepemilikansim',
                updateAction: base_url+'index.php/masterdata/kepemilikansim/updatekepemilikansim',
                deleteAction: base_url+'index.php/masterdata/kepemilikansim/deletekepemilikansim'
                */
            },
            fields: {
                KATEGORISUMBERSAMPAH_KODE: {
                    key: true,
                    title: 'Kode',
                    create: false
                },
                KATEGORISUMBERSAMPAH_NAMA: {
                    title: 'Nama',
                    create: false
                }
                ,
                total_sampah_dari_sumber_ton: {
                    title: 'Total Tonase (Ton)',
                    create: false
                }
            },
            formCreated: function (event, data2) {

            }
        });
        $('#TonaseSumberSampahContainer').jtable('load');
        $('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
            console.log("Tanggal Dari: " + $('#daritanggalTransaksi').val() + " , Tanggal Sampai: " + $('#sampaitanggalTransaksi').val());
            $('#TonaseSumberSampahContainer').jtable('load', {
                daritanggalTransaksi: $('#daritanggalTransaksi').val(),
                sampaitanggalTransaksi: $('#sampaitanggalTransaksi').val()
            });
            $.ajax({
                type: 'post',
                url: base_url + 'index.php/analisadata/tonasesumbersampah/gettotallist',
                async: true,
                data: {
                    daritanggalTransaksi: $('#daritanggalTransaksi').val(),
                    sampaitanggalTransaksi: $('#sampaitanggalTransaksi').val()
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
<legend>Data Tonase Sumber Sampah</legend>
<div class="filtering">
    <form>
        <table width="70%" align="center">
            <tr valign="middle">
                <td width="10%" align="right">Dari Tanggal</td>
                <td width="2%" align="center">:</td>
                <td width="20%" align="left" valign="middle">
                    <div class="input-control text" style="width: 150px">
                        <input type="text" name="daritanggalTransaksi" id="daritanggalTransaksi"
                               value="<?php echo $tanggalDari ?>"/>
                        <span id="image_button_daritanggalTransaksi" class="btn-date"></span>
                    </div>
                </td>

                <td width="10%" align="right">Sampai Tanggal</td>
                <td width="2%" align="center">:</td>
                <td width="20%" align="left" valign="middle">
                    <div class="input-control text" style="width: 150px">
                        <input type="text" name="sampaitanggalTransaksi" id="sampaitanggalTransaksi"
                               value="<?php echo $tanggalSampai ?>"/>
                        <span id="image_button_sampaitanggalTransaksi" class="btn-date"></span>
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
<div id="TonaseSumberSampahContainer"></div>
<legend>
    <div style="color:black; font-size:65%" id="totaltonase">Total Tonase : <?php echo $total_tonase; ?></div>
</legend>