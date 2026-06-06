<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#KategoriruteTableContainer').jtable({
            title: 'Daftar Kategori Rute',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KATEGORIRUTE_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kategorirute/getkategorirute',
				createAction: base_url+'index.php/masterdata/kategorirute/createkategorirute',
				updateAction: base_url+'index.php/masterdata/kategorirute/updatekategorirute',
                deleteAction: base_url+'index.php/masterdata/kategorirute/deletekategorirute'
            },
            fields: {
                KATEGORIRUTE_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				KATEGORIRUTE_NAMA: {
					title: 'Nama Kategori Rute'										
                }
				
            }
        });
		$('#KategoriruteTableContainer').jtable('load');
    });
</script>
<legend>Master Data Kategori Rute</legend>
<div id="KategoriruteTableContainer"></div>