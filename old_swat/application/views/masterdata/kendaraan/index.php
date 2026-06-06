<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedSpotOptions = null;
		var cachedStatusKendaraanOptions = null;
		var cachedAplikasiKendaraanOptions = null;
		var cachedKategoriKendaraanOptions = null;
		var cachedKategoriSumberSampahOptions = null;
		$('#aplikasiKendaraan').on('change', function (e) {
            var optionSelected = $("option:selected", this);
            var valueSelected = this.value;
            console.log("value aplikasiKendaraan selected : " + valueSelected);
            if (valueSelected == 0) {
                $("#kategoriKendaraan").empty();
                $('#containerKategoriKendaraan1').hide('fade');
                $('#containerKategoriKendaraan2').hide('fade');
                $('#containerKategoriKendaraan3').hide('fade');
            }
            else {
                $('#containerKategoriKendaraan1').show('fade');
                $('#containerKategoriKendaraan2').show('fade');
                $('#containerKategoriKendaraan3').show('fade');
                $.ajax({
                    type: "POST",
                    url: "<?php echo base_url(); ?>index.php/masterdata/kendaraan/getKategoriKendaraanByAplikasi",
                    data: "aplikasiKendaraanID=" + valueSelected,
                    success: function (data) {
                        if (data.length > 0) {
                            console.log(data);
                            $("#kategoriKendaraan").html(data);
                        }
                        else {
							$("#kategoriKendaraan").empty();
                			$('#containerKategoriKendaraan1').hide('fade');
			                $('#containerKategoriKendaraan2').hide('fade');
			                $('#containerKategoriKendaraan3').hide('fade');
							console.log("kosong");
						}

                    }
                });
            }
        });
        $('#KendaraanTableContainer').jtable({
            title: 'Daftar Kendaraan',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KENDARAAN_NOMORPOLISI ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kendaraan/getkendaraanbyfilter',
				createAction: base_url+'index.php/masterdata/kendaraan/createkendaraan',
				updateAction: base_url+'index.php/masterdata/kendaraan/updatekendaraan',
                deleteAction: base_url+'index.php/masterdata/kendaraan/deletekendaraan'
            },
            fields: {
                KENDARAAN_ID: {
                    key: true,
					title: 'ID',
					create: false,
					visibility:false
                },
				KENDARAAN_NOMORPOLISI: {
					title: 'No.Polisi',
                },
				APLIKASIKENDARAAN_NAMA:{
					title: 'Aplikasi',
					create: false,
					edit: false
				},
				APLIKASIKENDARAAN_ID: {
					title: 'Aplikasi',
					list:false,
					options: base_url+'index.php/masterdata/kendaraan/getaplikasikendaraan'
                },
				KATEGORIKENDARAAN_MERK:{
					title: 'Kategori',
					create: false,
					edit: false
				},
				KATEGORIKENDARAAN_ID: {
					title: 'Kategori',
					dependsOn: 'APLIKASIKENDARAAN_ID',
					list:false,
					options: function (data) {	
						if (data.source == 'list') {
							if (cachedKategoriKendaraanOptions) { //Check for cache
	                            return cachedKategoriKendaraanOptions;
	                        }
	                        var options = [];
	 
	                        $.ajax({ //Not found in cache, get from server
	                            url: base_url+'index.php/masterdata/kendaraan/getkategorikendaraan?aplikasiKendaraanID=0',
	                            type: 'POST',
	                            dataType: 'json',
	                            async: false,
	                            success: function (data2) {
	                                if (data2.Result != 'OK') {
	                                    alert(data2.Message);
	                                    return;
	                                }
	                                options = data2.Options;
	                            }
	                        });
	                        return cachedKategoriKendaraanOptions = options;
						}
						return base_url+'index.php/masterdata/kendaraan/getkategorikendaraan?aplikasiKendaraanID='+ data.dependedValues.APLIKASIKENDARAAN_ID;
                    }
                },
				SPOT_NAMA:{
					title: 'Pool',
					create: false,
					edit: false
				},
				SPOT_POOL_ID: {
					title: 'Pool',
					list: false,
					options: function () {
                        if (cachedSpotOptions) { //Check for cache
                            return cachedSpotOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kendaraan/getspot',
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
				KATEGORISUMBERSAMPAH_NAMA:{
					title: 'Kode',
					create: false,
					edit: false
				},
				KENDARAAN_NOMORRANGKA: {
					title: 'No.Rangka',
					visibility: 'hidden'
                },
				KENDARAAN_NOMORMESIN: {
					title: 'No.Mesin',
					visibility: 'hidden'
                },
				KENDARAAN_TAHUNPEMBUATAN: {
					title: 'Tahun Pembuatan',
					visibility: 'hidden'
                },
				KENDARAAN_RASIOBAHANBAKARTERKINI: {
					title: 'Rasio Bahan Bakar Terkini',
					visibility: 'hidden'
                },
				KENDARAAN_BERATKOSONGTERKINI: {
					title: 'Berat Kosong Terkini',
					visibility: 'hidden'
                },
				KENDARAAN_KMTERKINI: {
					title: 'Km Terkini',
					visibility: 'hidden'
                },
				KENDARAAN_MASABERLAKUSTNK: {
					title: 'Masa Berlaku STNK',
					visibility: 'hidden',
                },
				KENDARAAN_MASABERLAKUPAJAKSTNK: {
					title: 'Masa Berlaku Pajak STNK',
					visibility: 'hidden'
                },
				STATUSKENDARAAN_NAMA: {
					title: 'Status',
					create: false,
					edit: false
				},
				STATUSKENDARAAN_ID: {
					title: 'Status',
					list:false,
					options: function () {
                        if (cachedStatusKendaraanOptions) { //Check for cache
                            return cachedStatusKendaraanOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kendaraan/getstatuskendaraan',
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
                         
                        return cachedStatusKendaraanOptions = options;
                    }
					
                },
				KENDARAAN_KETERANGAN: {
					title: 'Keterangan',
                },
				WARNING_STNKKENDARAAN: {
					title: 'Warning STNK',
					sorting: false,
                    edit: false,
                    create: false,
                    width: '3%',
                    display: function (kendaraanData) {
                        var $iconWarningSTNK = $('<center><span class="icon-mail fg-red large" title="Klik Untuk Memberikan warning Masa Berlaku STNK Kendaraan Akan Habis"></span></center>');
                        $iconWarningSTNK.click(function () {
                        	alert('Warning Masa Berlaku STNK Kendaraan Akan Habis Untuk Kendaraan '+kendaraanData.record.KENDARAAN_NOMORPOLISI+' Berhasil Dikirim.');
                        });
                        return $iconWarningSTNK;
					}
					
                },
				WARNING_PAJAKSTNKKENDARAAN: {
					title: 'Warning Pajak',
					sorting: false,
                    edit: false,
                    create: false,
                    width: '3%',
                    display: function (kendaraanData) {
                        var $iconWarningPajakSTNK = $('<center><span class="icon-mail fg-red large" title="Klik untuk memberikan warning masa berlaku pajak STNK kendaraan akan habis"></span></center>');
                        $iconWarningPajakSTNK.click(function () {
                        	alert('Warning masa berlaku pajak STNK akan habis untuk kendaraan '+kendaraanData.record.KENDARAAN_NOMORPOLISI+' Berhasil Dikirim.');
                        });
                        return $iconWarningPajakSTNK;
					}
                }
            },
			formCreated: function (event, data) 
            {
				var $input_tahunPembuatan = data.form.find ('input[name="KENDARAAN_TAHUNPEMBUATAN"]');
				$input_tahunPembuatan.mask("9999");
				
                var $input_masaBerlakuSTNK = data.form.find ('input[name="KENDARAAN_MASABERLAKUSTNK"]');
				$input_masaBerlakuSTNK.datetimepicker({
					mask:'9999-19-39',
					format:'Y-m-d',
					timepicker:false,
					closeOnDateSelect:true
				});
				
				var $input_masaBerlakuPajakSTNK = data.form.find ('input[name="KENDARAAN_MASABERLAKUPAJAKSTNK"]');
				
				$input_masaBerlakuPajakSTNK.datetimepicker({
					mask:'9999-19-39',
					format:'Y-m-d',
					timepicker:false,
					closeOnDateSelect:true
				});
            },
			recordUpdated: function (event, data) {
				$('#KendaraanTableContainer').jtable('reload');
			}
        });
		//$('#KendaraanTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#nopolKendaraan').val()+" "+$('#aplikasiKendaraan').val()+" "+$('#kategoriKendaraan').val()+" "+$('#poolKendaraan').val()+" "+$('#kodeKendaraan').val()+" "+$('#statusKendaraan').val());
            $('#KendaraanTableContainer').jtable('load', {
                nopolKendaraan: $('#nopolKendaraan').val(),
                aplikasiKendaraan: $('#aplikasiKendaraan').val(),
                kategoriKendaraan: $('#kategoriKendaraan').val(),
                poolKendaraan: $('#poolKendaraan').val(),
                kodeKendaraan: $('#kodeKendaraan').val(),
				statusKendaraan: $('#statusKendaraan').val()
            });
        });
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Kendaraan</legend>
<div class="filtering">
    <form>
		<table width="100%" align="center">
			<tr valign="middle">
				<td width="10%" align="right" >Nopol</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px;vertical-align: middle;" >
						<input type="text" name="nopolKendaraan" id="nopolKendaraan" placeholder="Nomor Polisi" />
					</div>
				</td>
				<td width="10%" align="right">Aplikasi</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width:  150px" > 
				        <select id="aplikasiKendaraan" name="aplikasiKendaraan">
				            <option selected="selected" value="0">All Aplikasi</option>
							<?php
					       		foreach($all_aplikasikendaraan->result() as $row)
					       		{
									echo '<option value="'.$row->APLIKASIKENDARAAN_ID.'">'.$row->APLIKASIKENDARAAN_NAMA.'</option>';
					       		}
				    		?>
				        </select>
					</div>
				</td>
				<td width="10%" align="right"><div id="containerKategoriKendaraan1" style="display: none">Kategori</div></td>
				<td width="2%" align="center"><div id="containerKategoriKendaraan2" style="display: none">:</div></td>
				<td width="20%" align="left">
					<div id="containerKategoriKendaraan3" class="input-control select" style="width:  150px;display: none"> 
				        <select id="kategoriKendaraan" name="kategoriKendaraan">
		                </select>
					</div>
				</td>
			</tr>
			<tr valign="middle">
				<td width="10%" align="right" >Pool</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control select" style="width: 150px"> 
				        <select id="poolKendaraan" name="poolKendaraan">
				            <option selected="selected" value="0">All Pool</option>
							<?php
					       		foreach($all_pool->result() as $row)
					       		{
									echo '<option value="'.$row->SPOT_ID.'">'.$row->SPOT_NAMA.'</option>';
					       		}
					       		
				    		?>
				        </select>
					</div>
				</td>
				<td width="10%" align="right">Kode</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width:  150px" > 
				        <select id="kodeKendaraan" name="kodeKendaraan">
				            <option selected="selected" value="0">All Kode</option>
							<?php
					       		foreach($all_kode->result() as $row)
					       		{
									echo '<option value="'.$row->KATEGORISUMBERSAMPAH_ID.'">'.$row->KATEGORISUMBERSAMPAH_NAMA.'</option>';
					       		}
				    		?>
				        </select>
					</div>
				</td>
				<td width="10%" align="right">Status</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width: 150px"> 
				        <select id="statusKendaraan" name="statusKendaraan">
				            <option selected="selected" value="0">All Status</option>
							<?php
					       		foreach($all_statuskendaraan->result() as $row)
					       		{
									echo '<option value="'.$row->STATUSKENDARAAN_ID.'">'.$row->STATUSKENDARAAN_NAMA.'</option>';
					       		}
					       		
				    		?>
				        </select>
					</div>
				</td>
			</tr>
			<tr valign="middle">
			<td></td>
			<td></td>
				<td colspan="6">
					<button class="primary large" type="submit" id="LoadRecordsButton">Load records</button>
				</td>
			</tr>
		</table>				
        
    </form>
</div>
<div id="KendaraanTableContainer"></div>