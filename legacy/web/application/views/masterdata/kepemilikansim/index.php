<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedPengemudiOptions = null;
		var cachedSimOptions = null;
        $('#KepemilikansimTableContainer').jtable({
            title: 'Daftar Kepemilikan Sim',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KEPEMILIKANSIM_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kepemilikansim/getkepemilikansim',
				createAction: base_url+'index.php/masterdata/kepemilikansim/createkepemilikansim',
				updateAction: base_url+'index.php/masterdata/kepemilikansim/updatekepemilikansim',
                deleteAction: base_url+'index.php/masterdata/kepemilikansim/deletekepemilikansim'
            },
            fields: {
                KEPEMILIKANSIM_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				PENGEMUDI_ID: {
					title: 'Nama Pengemudi',
					options: function () {
                        if (cachedPengemudiOptions) { //Check for cache
                            return cachedPengemudiOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kepemilikansim/getpengemudi',
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
                         
                        return cachedPengemudiOptions = options;
                    }
                },
				SIM_ID: {
					title: 'Jenis Sim',
					options: function () {
                        if (cachedSimOptions) { //Check for cache
                            return cachedSimOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kepemilikansim/getsim',
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
                         
                        return cachedSimOptions = options;
                    }
                },
				KEPEMILIKANSIM_NOMORSIM: {
					title: 'Nomor Sim'
                },
				KEPEMILIKANSIM_MASABERLAKUSIM: {
					title: 'Masa Berlaku',
					type: 'date'
                }
            },
			formCreated: function (event, data2) 
            {										
				var $input_masaBerlakuSIM = data2.form.find ('input[name="KEPEMILIKANSIM_MASABERLAKUSIM"]');
				$input_masaBerlakuSIM.datetimepicker({
					mask:'9999-19-39',
					format:'Y-m-d',
					timepicker:false,
					closeOnDateSelect:true	
				});
				var $input_nomorSIM = data2.form.find ('input[name="KEPEMILIKANSIM_NOMORSIM"]');
				$input_nomorSIM.mask("999999999999");
            }
        });
		$('#KepemilikansimTableContainer').jtable('load');
    });
</script>
<legend>Master Data Kepemilikan Sim</legend>
<div id="KepemilikansimTableContainer"></div>