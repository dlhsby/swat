<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
  $(document).ready(function(){
    var base_url = "<?php echo base_url() ?>";
      $('#Retribusi').jtable({
        title: 'Daftar Retribusi',
        paging: true,
        pageSize: 10,
        sorting: true,
        defaultSorting: 'ID_KATEGORI_RETRIBUSI ASC',
        columnResizable: true,
        columnSelectable: true,
        saveUserPreferences true,
        actions:{
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
            title: 'Jumlah'
          }
        },
        formCreated: function(event,data)
        {
          var $tanggal_retribusi = data.form.find ('input[name="TANGGAL"]');
          $tanggal_retribusi.datetimepicker({
            mask:'9999-19-39',
            format: 'Y-m-d',
            timepicker:false,
            closeOnDateSelect:true
          });
          var $jumlah = data.form.find ('input[name="JUMLAH"]');
          $jumlah.mask("99999999999");
        }
    });
    $('#Retribusi').jtable('load');
  });
</script>
<legend>Retribusi</legend>
<div class="Retribusi" id="Retribusi"></div>
