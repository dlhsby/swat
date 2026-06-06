<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
        $('#HakaksesTableContainer').jtable({
            title: 'Daftar Hak Akses',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'HAKAKSES_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/hakakses/gethakakses',
				createAction: base_url+'index.php/masterdata/hakakses/createhakakses',
				updateAction: base_url+'index.php/masterdata/hakakses/updatehakakses',
                deleteAction: base_url+'index.php/masterdata/hakakses/deletehakakses'
            },
            fields: {
                HAKAKSES_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				HAKAKSES_NAMA: {
					title: 'Nama Hak Akses'										
                }
				
            }
        });
		$('#HakaksesTableContainer').jtable('load');
    });
</script>
<legend>Master Data Hak Akses</legend>
<div id="HakaksesTableContainer"></div>