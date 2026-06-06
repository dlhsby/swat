<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedHakaksesOptions = null;
        $('#PenggunaTableContainer').jtable({
            title: 'Daftar Pengguna',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'HAKAKSES_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/pengguna/getpengguna',
				createAction: base_url+'index.php/masterdata/pengguna/createpengguna',
				updateAction: base_url+'index.php/masterdata/pengguna/updatepengguna',
                deleteAction: base_url+'index.php/masterdata/pengguna/deletepengguna'
            },
            fields: {
                PENGGUNA_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				PENGGUNA_FOTO: {
					title: 'Foto',
                },
				PENGGUNA_NAMA: {
					title: 'Nama',
                },
				HAKAKSES_ID: {
					title: 'Hak Akses',
					options: function () {
                        if (cachedHakaksesOptions) { //Check for cache
                            return cachedHakaksesOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/pengguna/gethakakses',
                            type: 'POST',
                            dataType: 'json',
                            async: false,
                            success: function (data) {
                                if (data.Result != 'OK') {
                                    alert(data.Message);
                                    return;
                                }
                                options = data.Options;
                            }
                        });
                         
                        return cachedHakaksesOptions = options;
                    }
                },
				PENGGUNA_USERNAME: {
					title: 'Username',
                },
				PENGGUNA_PASSWORD: {
					title: 'Password',
					list: false,
					edit: false
                }
            }
        });
		$('#PenggunaTableContainer').jtable('load');
    });
</script>
<legend>Master Data Pengguna</legend>
<div id="PenggunaTableContainer"></div>