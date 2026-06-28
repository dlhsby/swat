<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#KategorisumbersampahTableContainer').jtable({
            title: 'Daftar Kategori Sumber Sampah',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KATEGORISUMBERSAMPAH_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kategorisumbersampah/getkategorisumbersampah',
				createAction: base_url+'index.php/masterdata/kategorisumbersampah/createkategorisumbersampah',
				updateAction: base_url+'index.php/masterdata/kategorisumbersampah/updatekategorisumbersampah',
                deleteAction: base_url+'index.php/masterdata/kategorisumbersampah/deletekategorisumbersampah'
            },
            fields: {
                KATEGORISUMBERSAMPAH_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				KATEGORISUMBERSAMPAH_KODE: {
					title: 'Kode'										
                },
				KATEGORISUMBERSAMPAH_NAMA: {
					title: 'Nama'										
                },
				KATEGORISUMBERSAMPAH_KETERANGAN: {
					title: 'Keterangan'										
                }
				
            }
        });
		$('#KategorisumbersampahTableContainer').jtable('load');
    });
</script>
<legend>Master Data Kategori Sumber Sampah</legend>
<div id="KategorisumbersampahTableContainer"></div>