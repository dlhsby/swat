<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedPengemudiOptions = null;
		var cachedKendaraanOptions = null;
        $('#PenjadwalanMasterDetailTransaksiTableContainer').jtable({
            title: 'Master Detail Transaksi',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID ASC',
			columnResizable: true, 
            columnSelectable: true, 
            saveUserPreferences: true, 
            actions: {
                listAction: base_url+'index.php/masterdata/masterdetailtransaksi/getmasterdetailtransaksibyfilter',
				createAction: base_url+'index.php/masterdata/masterdetailtransaksi/createmasterdetailtransaksi',
				updateAction: base_url+'index.php/masterdata/masterdetailtransaksi/updatemasterdetailtransaksi',
				deleteAction: base_url+'index.php/masterdata/masterdetailtransaksi/deletemasterdetailtransaksi'
            },
            fields: {
				MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID: {
					key: true,
					create: false,
					edit: false,
					title: 'ID'
				},
				masterTrayek: {
					title: '',
					sorting: false,
					edit: false,
					create: false,
					width: '3%',
					display: function (masterDetailTransaksiData){
						var $iconMasterTrayek = $('<span class="icon-bus large fg-cyan" title="Klik Untuk Menampilkan Daftar Master Trayek"></span>');
						$iconMasterTrayek.click(function (){
							$('#PenjadwalanMasterDetailTransaksiTableContainer').jtable('openChildTable', $iconMasterTrayek.closest('tr'),                                                        
							{   
								title: 'Master Trayek, Master Detail Transaksi Nomor '+masterDetailTransaksiData.record.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID+', Kendaraan '+masterDetailTransaksiData.record.KENDARAAN_NOMORPOLISI+', Pengemudi '+masterDetailTransaksiData.record.PENGEMUDI_NAMA,
								actions: {
									listAction: base_url+'index.php/masterdata/masterdetailtransaksi/getmastertrayekbymasterdetailtransaksi?MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID='+masterDetailTransaksiData.record.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,
									createAction: base_url+'index.php/masterdata/masterdetailtransaksi/createmastertrayek',
									updateAction: base_url+'index.php/masterdata/masterdetailtransaksi/updatemastertrayek',
									deleteAction: base_url+'index.php/masterdata/masterdetailtransaksi/deletemastertrayek'
								},
								fields: {
									MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID: {
										type: 'hidden',
										defaultValue: masterDetailTransaksiData.record.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID
									},
									MASTERTRAYEK_ID: {
										key: true,
										create: false,
										edit: false,
										title: 'ID'
									},
									KATEGORI_SPOT_ASAL_ID: {
										title: 'Kategori Rute Asal',
										list: false,
										options: base_url+'index.php/masterdata/masterdetailtransaksi/getkategorispot'	
									},
									SPOT_ASAL_ID: {
										title: 'Rute Asal',
										dependsOn: 'KATEGORI_SPOT_ASAL_ID',
										list:false,
										options: function (data) {
											if (data.source == 'list') {
												if (cachedSpotAsalOptions) { //Check for cache
						                            return cachedSpotAsalOptions;
						                        }
						                        var options = [];
						 
						                        $.ajax({ 
						                            url: base_url+'index.php/masterdata/masterdetailtransaksi/getspotbykategorispot?kategoriSpotID=0',
						                            type: 'POST',
						                            dataType: 'json',
						                            async: false,
						                            success: function (data3) {
						                                if (data3.Result != 'OK') {
						                                    alert(data3.Message);
						                                    return;
						                                }
						                                options = data3.Options;
						                            }
						                        });
						                         
						                        return cachedSpotAsalOptions = options;
					                        }
					                        return base_url+'index.php/masterdata/masterdetailtransaksi/getspotbykategorispot?kategoriSpotID='+ data.dependedValues.KATEGORI_SPOT_ASAL_ID;		    		
					                    }
									},
									KATEGORI_SPOT_TUJUAN_ID: {
										title: 'Kategori Rute Tujuan',
										list: false,
										options: base_url+'index.php/masterdata/masterdetailtransaksi/getkategorispot'	
									},
									SPOT_TUJUAN_ID: {
										title: 'Rute Tujuan',
										dependsOn: 'KATEGORI_SPOT_TUJUAN_ID',
										list:false,
										options: function (data) {	
											if (data.source == 'list') {
												if (cachedSpotTujuanOptions) { //Check for cache
						                            return cachedSpotTujuanOptions;
						                        }
						                        var options = [];
						 
						                        $.ajax({ 
						                            url: base_url+'index.php/masterdata/masterdetailtransaksi/getspotbykategorispot?kategoriSpotID=0',
						                            type: 'POST',
						                            dataType: 'json',
						                            async: false,
						                            success: function (data3) {
						                                if (data3.Result != 'OK') {
						                                    alert(data3.Message);
						                                    return;
						                                }
						                                options = data3.Options;
						                            }
						                        });
						                         
						                        return cachedSpotTujuanOptions = options;
					                        }
											return base_url+'index.php/masterdata/masterdetailtransaksi/getspotbykategorispot?kategoriSpotID='+ data.dependedValues.KATEGORI_SPOT_TUJUAN_ID;			
					                    }
									},
									SPOT_ASAL_NAMA: {
										title: 'Asal',
										edit: false,
										create: false
									},
									SPOT_TUJUAN_NAMA: {
										title: 'Tujuan',
										edit: false,
										create: false
									},
									MASTERTRAYEK_WAKTUTARGET: {
										title: 'Waktu Target'
									},
									MASTERTRAYEK_JUMLAHISIBBMDIAJUKAN: {
										title: 'BBM Diajukan'
									}
								},
								formCreated: function (event, data2) 
					            {										
									var $input_waktuTarget = data2.form.find ('input[name="MASTERTRAYEK_WAKTUTARGET"]');
									$input_waktuTarget.datetimepicker({
										datepicker:false,
										mask:'29:59:59',
										format:'H:i:s',
										step:15
									});
					            },
								recordUpdated: function (event, data2) {
									data2.row.closest('.jtable-child-table-container').jtable('reload');
								}
							},function (data){				
								data.childTable.jtable('load');
							});
						});
						return $iconMasterTrayek;
					}
				},		
				SPOT_NAMA: {
					title: 'Pool',
					edit: false,
					create: false
				},
				KENDARAAN_NOMORPOLISI: {
					title: 'Nopol',
					edit: false,
					create: false
				},
				PENGEMUDI_NAMA: {
					title: 'Pengemudi',
					edit: false,
					create: false
				},
				SPOT_POOL_ID: {
					title: 'Pool',
					list:false,
                    options: base_url+'index.php/masterdata/masterdetailtransaksi/getpool'
				},				
				KENDARAAN_ID: {
					title: 'Nopol Kendaraan',
					dependsOn: 'SPOT_POOL_ID',
					list:false,
					options: function (data) {	
						if (data.source == 'list') {
							if (cachedPengemudiOptions) {
	                            return cachedPengemudiOptions;
	                        }
	                        var options = [];
	 
	                        $.ajax({ 
	                            url: base_url+'index.php/masterdata/masterdetailtransaksi/getkendaraan?poolID=0',
	                            type: 'POST',
	                            dataType: 'json',
	                            async: false,
	                            success: function (data3) {
	                                if (data3.Result != 'OK') {
	                                    alert(data3.Message);
	                                    return;
	                                }
	                                options = data3.Options;
	                            }
	                        });
	                         
	                        return cachedPengemudiOptions = options;
                        }
                        return base_url+'index.php/masterdata/masterdetailtransaksi/getkendaraan?poolID='+ data.dependedValues.SPOT_POOL_ID;						                       
                    }
				},
				PENGEMUDI_ID: {
					title: 'Pengemudi',
					dependsOn: 'SPOT_POOL_ID',
					list:false,
					options: function (data) {	
						if (data.source == 'list') {
							if (cachedPengemudiOptions) {
	                            return cachedPengemudiOptions;
	                        }
	                        var options = [];
	 
	                        $.ajax({ 
	                            url: base_url+'index.php/masterdata/masterdetailtransaksi/getpengemudi?poolID=0',
	                            type: 'POST',
	                            dataType: 'json',
	                            async: false,
	                            success: function (data3) {
	                                if (data3.Result != 'OK') {
	                                    alert(data3.Message);
	                                    return;
	                                }
	                                options = data3.Options;
	                            }
	                        });
	                         
	                        return cachedPengemudiOptions = options;
                        }
                        return base_url+'index.php/masterdata/masterdetailtransaksi/getpengemudi?poolID='+ data.dependedValues.SPOT_POOL_ID;						                       
                    }
				},
				MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG: {
					title: 'Waktu Target Berangkat'
				},	
				MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG: {
					title: 'Waktu Target Kembali'
				}			
            },
			formCreated: function (event, data2) 
            {										
				var $input_waktuTargetBerangkat = data2.form.find ('input[name="MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUBERANGKATKANDANG"]');
				//$input_waktuTargetBerangkat.closest('.jtable-input-field-container').hide('fade');
				$input_waktuTargetBerangkat.datetimepicker({
					datepicker:false,
					mask:'29:59:59',
					format:'H:i:s',
					step:15	
				});
				
				var $input_waktuTargetKembali = data2.form.find ('input[name="MASTERDETAILTRANSAKSIANGKUTSAMPAH_WAKTUKEMBALIKANDANG"]');
				
				$input_waktuTargetKembali.datetimepicker({
					datepicker:false,
					mask:'29:59:59',
					format:'H:i:s',
					step:15	
				});
            },
			recordUpdated: function (event, data2) {
				$('#PenjadwalanMasterDetailTransaksiTableContainer').jtable('reload');
			}
        });
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#nopolKendaraan').val()+" "+$('#namaPengemudi').val()+" "+$('#poolKendaraan').val());
            $('#PenjadwalanMasterDetailTransaksiTableContainer').jtable('load', {
				nopolKendaraan: $('#nopolKendaraan').val(),			               
                namaPengemudi: $('#namaPengemudi').val(),
                poolKendaraan: $('#poolKendaraan').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
		<li><a href="<?php echo base_url().'index.php/masterdata'; ?>">Master Data</a></li>
		<li class="active"><a href="#">Master Detail Transaksi</a></li>
    </ul>
</nav>
</br>
<legend>Master Data Detail Transaksi</legend>
<div class="filtering">
    <form>
		<table width="100%" align="center">
			<tr valign="middle">
				<td width="10%" align="right">Nopol</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="bottom">
					<div class="input-control text" style="width: 150px;vertical-align: bottom;" >
						<input type="text" name="nopolKendaraan" id="nopolKendaraan" placeholder="Nomor Polisi" />
					</div>
				</td>
				<td width="10%" align="right" >Pengemudi</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px;vertical-align: middle;" >
						<input type="text" name="namaPengemudi" id="namaPengemudi" placeholder="Nama Pengemudi" />
					</div>
				</td>
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
<div id="PenjadwalanMasterDetailTransaksiTableContainer"></div>