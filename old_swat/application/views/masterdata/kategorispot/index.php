<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#KategorispotTableContainer').jtable({
            title: 'Daftar Kategori Spot',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KATEGORISPOT_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kategorispot/getkategorispot',
				createAction: base_url+'index.php/masterdata/kategorispot/createkategorispot',
				updateAction: base_url+'index.php/masterdata/kategorispot/updatekategorispot',
                deleteAction: base_url+'index.php/masterdata/kategorispot/deletekategorispot'
            },
            fields: {
                KATEGORISPOT_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				KATEGORISPOT_NAMA: {
					title: 'Nama Kategori Spot'										
                }
				
            }
        });
		$('#KategorispotTableContainer').jtable('load');
    });
</script>
<legend>Master Data Kategori Spot</legend>
<div id="KategorispotTableContainer"></div>