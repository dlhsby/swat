<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
		
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedSpotOptions = null;
		var cachedStatusKepegawaianOptions = null;
		
        $('#PengemudiTableContainer').jtable({
            title: 'Daftar Pengemudi',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'PENGEMUDI_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/pengemudi/getpengemudibyfilter',
				createAction: base_url+'index.php/masterdata/pengemudi/createpengemudi',
				updateAction: base_url+'index.php/masterdata/pengemudi/updatepengemudi',
                deleteAction: base_url+'index.php/masterdata/pengemudi/deletepengemudi'
            },
            toolbar: {
			    items: [{
			        icon: base_url+'/assets/images/excel.png',
			        text: 'Rapor Pengemudi Terbaik',
			        click: function () {
			            var url = 'https://docs.google.com/spreadsheets/d/1lJ1z0mb7XWDPb5iDufFGcU6jYMX4BLHjMDYxGGHPDP0/export?format=xlsx';
						window.open(url);
			        }
			    },{
			        icon: base_url+'/assets/images/excel.png',
			        text: 'Rapor Pengemudi Terevaluasi',
			        click: function () {
			            var url = 'https://docs.google.com/spreadsheets/d/1TjCiOrnWmJY8ggIWVfmQpyZ6NMLwTCfrxqd8D6Tud9A/export?format=xlsx';
						window.open(url);
			        }
			    }
			    ]
			},
            fields: {
                PENGEMUDI_ID: {
                    key: true,
					title: 'ID',
					create: false,
					list: false
                },
				PENGEMUDI_NOMORKTP: {
					title: 'NIK',
                },
				PENGEMUDI_NAMA: {
					title: 'Nama',
                },
				SPOT_POOL_ID: {
					title: 'Pool',
					options: function () {
                        if (cachedSpotOptions) { //Check for cache
                            return cachedSpotOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/pengemudi/getspot',
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
                         
                        return cachedSpotOptions = options;
                    }
                },
				STATUSKEPEGAWAIAN_ID: {
					title: 'Status',
					options: function () {
                        if (cachedStatusKepegawaianOptions) { //Check for cache
                            return cachedStatusKepegawaianOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/pengemudi/getstatuskepegawaian',
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
                         
                        return cachedStatusKepegawaianOptions = options;
                    }
                },
				PENGEMUDI_ALAMATASAL: {
					title: 'Alamat Asal',
					list: false
                },
				PENGEMUDI_ALAMATDOMISILI: {
					title: 'Alamat Domisili'
                },
				PENGEMUDI_TANGGALLAHIR: {
					title: 'Tanggal Lahir',
					type: 'date'
                },
				PENGEMUDI_KONTAK: {
					title: 'Kontak'
                },
				PENGEMUDI_PELATIHANSAFETY: {
					title: 'Pelatihan Safety',
					list: false,
					options: { 'BELUM': 'BELUM', 'SUDAH': 'SUDAH'},
					defaultValue: 'BELUM'
                },
				PENGEMUDI_FOTO: {
					title: 'Foto',
					list: false,
					create: false
                },
				PENGEMUDI_KETERANGAN: {
					title: 'Keterangan',
					defaultValue: 'AKTIF'
                },
				WARNING_SIMKENDARAAN: {
					title: 'Warning SIM',
					sorting: false,
                    edit: false,
                    create: false,
                    width: '3%',
                    display: function (pengemudiData) {
                        var $iconWarningSIM = $('<center><span class="icon-mail fg-red large" title="Klik untuk memberikan warning masa berlaku SIM pengemudi akan habis"></span></center>');
                        $iconWarningSIM.click(function () {
                        	alert('Warning masa berlaku SIM pengemudi akan habis untuk pengemudi '+pengemudiData.record.PENGEMUDI_NAMA+' berhasil dikirim.');
                        });
                        return $iconWarningSIM;
					}
					
                },
            },
			formCreated: function (event, data2) 
            {										
				var $input_tanggalLahir = data2.form.find ('input[name="PENGEMUDI_TANGGALLAHIR"]');
				$input_tanggalLahir.datetimepicker({
					mask:'9999-19-39',
					format:'Y-m-d',
					timepicker:false,
					closeOnDateSelect:true	
				});
				var $input_nomorKTP = data2.form.find ('input[name="PENGEMUDI_NOMORKTP"]');
				$input_nomorKTP.mask("999999999999");
            }
        });
		//$('#PengemudiTableContainer').jtable('load');		
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#nikPengemudi').val()+" "+$('#namaPengemudi').val()+" "+$('#poolPengemudi').val()+" "+$('#statusKepegawaian').val());
            $('#PengemudiTableContainer').jtable('load', {
                nikPengemudi: $('#nikPengemudi').val(),
                namaPengemudi: $('#namaPengemudi').val(),
                poolPengemudi: $('#poolPengemudi').val(),
                statusKepegawaian: $('#statusKepegawaian').val()
            });
        });
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Pengemudi</legend>
<div class="filtering">
    <form>
		NIK :
		<div class="input-control text" style="width: 150px">
			<input type="text" name="nikPengemudi" id="nikPengemudi" placeholder="NIK" />
		</div>
		Nama :
		<div class="input-control text" style="width: 150px">
			<input type="text" name="namaPengemudi" id="namaPengemudi" placeholder="Nama" />
		</div>
        Pool :
		<div class="input-control select" style="width: 150px"> 
	        <select id="poolPengemudi" name="poolPengemudi">
	            <option selected="selected" value="0">All Pool</option>
				<?php
		       		foreach($all_pool->result() as $row)
		       		{
						echo '<option value="'.$row->SPOT_ID.'">'.$row->SPOT_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
		Status :
		<div class="input-control select" style="width: 150px"> 
	        <select id="statusKepegawaian" name="statusKepegawaian">
	            <option selected="selected" value="0">All Status</option>
				<?php
		       		foreach($all_statuskepegawaian->result() as $row)
		       		{
						echo '<option value="'.$row->STATUSKEPEGAWAIAN_ID.'">'.$row->STATUSKEPEGAWAIAN_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="PengemudiTableContainer"></div>