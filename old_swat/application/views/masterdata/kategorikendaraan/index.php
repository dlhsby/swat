<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var cachedAplikasiKendaraanOptions = null;
		var cachedBahanBakarOptions = null;
		var base_url = "<?php echo base_url() ?>";
        $('#KategorikendaraanTableContainer').jtable({
            title: 'Daftar Kategori Kendaraan',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KATEGORIKENDARAAN_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kategorikendaraan/getkategorikendaraan',
				createAction: base_url+'index.php/masterdata/kategorikendaraan/createkategorikendaraan',
				updateAction: base_url+'index.php/masterdata/kategorikendaraan/updatekategorikendaraan',
                deleteAction: base_url+'index.php/masterdata/kategorikendaraan/deletekategorikendaraan'
            },
            fields: {
                KATEGORIKENDARAAN_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				APLIKASIKENDARAAN_ID: {
					title: 'Aplikasi',
					options: function () {
                        if (cachedAplikasiKendaraanOptions) { //Check for cache
                            return cachedAplikasiKendaraanOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kategorikendaraan/getaplikasikendaraan',
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
                         
                        return cachedAplikasiKendaraanOptions = options;
                    }
                },
				KATEGORIKENDARAAN_MERK: {
					title: 'Merk'										
                },
				BAHANBAKAR_ID: {
					title: 'Bahan Bakar',
					options: function () {
                        if (cachedBahanBakarOptions) { //Check for cache
                            return cachedBahanBakarOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kategorikendaraan/getbahanbakar',
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
                         
                        return cachedBahanBakarOptions = options;
                    }
                },
				KATEGORIKENDARAAN_KAPASITASBAHANBAKAR: {
					title: 'Kapasitas Bahan Bakar'		,
					list: false								
                },
				KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL: {
					title: 'Rasio Bahan Bakar',
					list: false										
                },
				KATEGORIKENDARAAN_BERATKOSONGNORMAL: {
					title: 'Berat Kosong Normal'										
                },
				KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM: {
					title: 'Berat Bersih Max',
					list: false									
                },
				KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM: {
					title: 'Volume Bersih Max',
					list: false									
                },
				KATEGORIKENDARAAN_JUMLAHRODA: {
					title: 'Jumlah Roda'										
                }
				
            }
        });
		$('#KategorikendaraanTableContainer').jtable('load');
    });
</script>
<legend>Master Data Kategori Kendaraan</legend>
<div id="KategorikendaraanTableContainer"></div>