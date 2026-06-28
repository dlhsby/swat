<?php if (!defined('BASEPATH')) exit('No direct script access allowed'); ?>

<script type="text/javascript">
    $(document).ready(function () {
        $("#frame").attr("src", "http://localhost:8090/importexcel/uploader-master/demo/");
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

        $('#ImportedExcelContainer').jtable({
            title: 'Import Excel Data SI',
            paging: true,
            pageSize: 10,
            sorting: true,
            defaultSorting: 'id ASC',
            columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url + 'index.php/transaksi/importexcel/getlist'
                /*
                listAction: base_url+'index.php/masterdata/kepemilikansim/getkepemilikansim',
                createAction: base_url+'index.php/masterdata/kepemilikansim/createkepemilikansim',
                updateAction: base_url+'index.php/masterdata/kepemilikansim/updatekepemilikansim',
                deleteAction: base_url+'index.php/masterdata/kepemilikansim/deletekepemilikansim'
                */
            },
            fields: {
                id: {
                    key: true,
                    title: 'No.',
                    create: false
                },
                tgltitle: {
                    title: 'Tgl.',
                    create: false
                },
                nopol: {
                    title: 'Nopol',
                    create: false
                },
                lpsdepo: {
                    title: 'LPS/Depo',
                    create: false
                },
                trukasal: {
                    title: 'Asal Truk',
                    create: false
                },
                bkotor: {
                    title: 'Berat Kotor',
                    create: false
                },
                bkosong: {
                    title: 'Berat Kosong',
                    create: false
                },
                bbersih: {
                    title: 'Berat Bersih',
                    create: false
                }
            },
            formCreated: function (event, data2) {

            }
        });
        $('#ImportedExcelContainer').jtable('load');

        $('#LoadRecordsButton').click(function (e) {
            var titleup = $("#titledate").html();
            $('#ImportedExcelContainer').jtable('load', {
                daritanggalTransaksi: $('#daritanggalTransaksi').val()
            });
        });
        $('#UpdateToSwatButton').click(function (e) {

            var TglDataDiupdate = $('#daritanggalTransaksi').val();
            if (confirm('Apakah data Tgl. ' + TglDataDiupdate + ' akan diupdate?')) {
                $.ajax({
                    type: 'post',
                    url: base_url + 'index.php/transaksi/importexcel/update_pembuangan_tpa_excel',
                    async: true,
                    data: {
                        daritanggalTransaksi: TglDataDiupdate
                    },
                    beforeSend: function () {
                        $('#inprocess').html("<img src='" +  base_url + "assets/images/processing.gif' height='40px'>");
                    },
                    success: function (data) {
                        $('#inprocess').html(data);
                        alert('Data Tgl. ' + TglDataDiupdate +  ' telah terupdate');
                    },
                    error: function (xhr, textStatus, error) {
                        $('#inprocess').html("");
                    },
                    timeout: 3600000
                });
            }
        });
    });
</script>    

<nav class="breadcrumbs">
    <ul>
        <li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Import Excel Data SI</a></li>
    </ul>
</nav>
</br>

<div id="mydiv">
    <iframe style="position: relative; overflow: hidden;" id="frame" src="" width="100%" height="100%" frameBorder="0" onload="this.height=10 + this.contentWindow.document.body.scrollHeight;"></iframe>
   <div id="logupload"></div>
</div>
<div id="titledate" style="margin-top: 0px;"><legend><strong>Data Penimbangan dari Excel</strong></legend></div>
<div class="filtering">
    <form>
        <table width="100%" align="center">
            <tr valign="left">
                <td width="2%" align="left">Filter Tanggal :</td>
                <td width="20%" align="left" valign="middle">
                    <div class="input-control text" style="width: 150px">
                        <input type="text" name="daritanggalTransaksi" id="daritanggalTransaksi" value="<?php echo $tanggalDari ?>"/>
                        <span id="image_button_daritanggalTransaksi" class="btn-date"></span>
                    </div>
                </td>
            </tr>
        </table>
    </form>
</div>
<button class="primary large" id="LoadRecordsButton">Load records</button>&nbsp;&nbsp;&nbsp;
<button class="primary large" id="UpdateToSwatButton">Update to SWAT</button>
<div id="inprocess"></div>
<br/>
<div id="ImportedExcelContainer"></div>

