<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
function toRp(angka){
    var rev     = parseInt(angka, 10).toString().split('').reverse().join('');
    var rev2    = '';
    for(var i = 0; i < rev.length; i++){
        rev2  += rev[i];
        if((i + 1) % 3 === 0 && i !== (rev.length - 1)){
            rev2 += '.';
        }
    }
    return 'Rp. ' + rev2.split('').reverse().join('') + ',00';
}

    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedPengemudiOptions = null;
		var cachedSimOptions = null;
        $('#Retribusi').jtable({
            title: 'Daftar Retribusi',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'ID_KATEGORI_RETRIBUSI DESC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/transaksi/retribusi/getretribusi',
				createAction: base_url+'index.php/transaksi/retribusi/createretribusi',
				updateAction: base_url+'index.php/transaksi/retribusi/updateretribusi',
                deleteAction: base_url+'index.php/transaksi/retribusi/deleteretribusi'
            },
            fields:{
              ID_KATEGORI_RETRIBUSI:{
                key: true,
                title:'ID',
                create: false
              },
              NAMA_KATEGORI_RETRIBUSI:{
                title: 'Nama Retribusi'
              },
              TANGGAL:{
                title:'Tanggal',
                type: 'date'
              },
              JUMLAH:{
                title: 'Jumlah',
                display: function (data) {
                  /*return Number(data.record.JUMLAH.toFixed(1)).toLocaleString();*/
                         return toRp(data.record.JUMLAH);
                         /*return data.record.JUMLAH;*/
                     }
              }
            },
            formCreated: function(event,data)
            {
              data.form.find('input[name="NAMA_KATEGORI_RETRIBUSI"]').addClass('validate[required]');
              /*var $tanggal_retribusi = data.form.find ('input[name="TANGGAL"]');
              $tanggal_retribusi.datetimepicker({
                mask:'9999-19-39',
                format: 'Y-m-d',
                timepicker:false,
                closeOnDateSelect:true
              });*/
              var $tanggal_retribusi = data.form.find ('input[name="TANGGAL"]');
              $tanggal_retribusi.datetimepicker({
                mask:'9999-19-39',
                format: 'Y-m-d',
                timepicker:false,
                closeOnDateSelect:true
              });
              data.form.validationEngine();
              /*var $jumlah = data.form.find ('input[name="JUMLAH"]');
              $jumlah.mask("99999999999");*/
            },
            formSubmitting: function (event, data) {
                return data.form.validationEngine('validate');
            },
            //Dispose validation logic when form is closed
            formClosed: function (event, data) {
                data.form.validationEngine('hide');
                data.form.validationEngine('detach');
            }
        });
		$('#Retribusi').jtable('load');
    });
</script>
<legend>Retribusi</legend>
<div id="Retribusi"></div>
