<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedKendaraanOptions = null;
		var cachedPengemudiOptions = null;
		var cachedSpotAsalOptions = null;
		var cachedSpotTujuanOptions = null;
		var cachedStatusTransaksiOptions = null;
		var cachedStatusDetailTransaksiOptions = null;
		var cachedStatusTrayekOptions = null;
        $('#RekapitulasiTableContainer').jtable({
            title: 'Daftar Rekapitulasi Hari',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'HARITRANSAKSI_ID ASC',
			columnResizable: true, 
            columnSelectable: true, 
            saveUserPreferences: true, 
            actions: {
                listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasiharibyfilter'
            },
            fields: {
                HARITRANSAKSI_ID: {
                    key: true,
					title: 'ID',
					create: false,
					width: '5%',
					display: function (data) {
                   		return $('<a href="'+base_url+'index.php/transaksi/rekapitulasi/transaksi/' + data.record.HARITRANSAKSI_TANGGAL + '">' + data.record.HARITRANSAKSI_ID + '</a>');
                    }
                },
				transaksi: {
                    title: '',
                    sorting: false,
                    edit: false,
                    create: false,
					width: '3%',
                    display: function (hariTransaksiData) {
                        var $iconTransaksi = $('<span class="icon-bus large" title="Klik Untuk Menampilkan Daftar Transaksi"></span>');
						$iconTransaksi.click(function () {
							$('#RekapitulasiTableContainer').jtable('openChildTable',
                                $iconTransaksi.closest('tr'),
                                {
                                    title: 'Transaksi, Tanggal '+hariTransaksiData.record.HARITRANSAKSI_TANGGAL,
                                    actions: {
                                        listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasitransaksibyharitransaksi?HARITRANSAKSI_ID='+hariTransaksiData.record.HARITRANSAKSI_ID,
										createAction: base_url+'index.php/transaksi/rekapitulasi/createrekapitulasitransaksi',
										updateAction: base_url+'index.php/transaksi/rekapitulasi/updaterekapitulasitransaksi',
										deleteAction: base_url+'index.php/transaksi/rekapitulasi/deleterekapitulasitransaksi'
                                    },
                                    fields: {
                                        HARITRANSAKSI_ID: {
                                            type: 'hidden',
                                            defaultValue: hariTransaksiData.record.HARITRANSAKSI_ID
                                        },
										TRANSAKSIANGKUTSAMPAH_ID: {
											key: true,
											create: false,
											edit: false,
											title: 'ID',
											width: '5%',
											display: function (data) {
						                   		return $('<a href="'+base_url+'index.php/transaksi/rekapitulasi/detailtransaksi/' + data.record.TRANSAKSIANGKUTSAMPAH_ID + '">' + data.record.TRANSAKSIANGKUTSAMPAH_ID + '</a>');
						                    }
										},
										detailTransaksi: {
											title: '',
											sorting: false,
						                    edit: false,
						                    create: false,
											width: '3%',
						                    display: function (transaksiData){
												var $iconDetailTransaksi = $('<span class="icon-bus large fg-cyan" title="Klik Untuk Menampilkan Daftar Detail Transaksi"></span>');
												$iconDetailTransaksi.click(function (){
													$iconDetailTransaksi.closest('.jtable-child-table-container').jtable('openChildTable', $iconDetailTransaksi.closest('tr'),                                                        
													{   
														title: 'Detail Transaksi, Transaksi Nomor '+transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID+', Tanggal '+hariTransaksiData.record.HARITRANSAKSI_TANGGAL+', Kendaraan '+transaksiData.record.KENDARAAN_NOMORPOLISI,
														actions: {
															listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasidetailtransaksibytransaksi?TRANSAKSIANGKUTSAMPAH_ID='+transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID,
															createAction: base_url+'index.php/transaksi/rekapitulasi/createrekapitulasidetailtransaksi',
															updateAction: base_url+'index.php/transaksi/rekapitulasi/updaterekapitulasidetailtransaksi',
															deleteAction: base_url+'index.php/transaksi/rekapitulasi/deleterekapitulasidetailtransaksi'
														},
														fields: {
															TRANSAKSIANGKUTSAMPAH_ID: {
																type: 'hidden',
																defaultValue: transaksiData.record.TRANSAKSIANGKUTSAMPAH_ID
															},
															DETAILTRANSAKSIANGKUTSAMPAH_ID: {
																key: true,
																create: false,
																edit: false,
																title: 'ID',
																display: function (data) {
											                   		return $('<a href="'+base_url+'index.php/transaksi/rekapitulasi/trayek/' + data.record.DETAILTRANSAKSIANGKUTSAMPAH_ID + '">' + data.record.DETAILTRANSAKSIANGKUTSAMPAH_ID + '</a>');
											                    }
															},
															trayek: {
																title: '',
																sorting: false,
																edit: false,
																create: false,
																width: '3%',
																display: function (trayekData){
																	var $iconTrayek = $('<span class="icon-bus large fg-red" title="Klik Untuk Menampilkan Daftar Trayek"></span>');
																	$iconTrayek.click(function (){
																		$iconTrayek.closest('.jtable-child-table-container').jtable('openChildTable', $iconTrayek.closest('tr'),                                                        
																		{   
																			title: 'Trayek, Detail Transaksi Nomor '+trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID+', Tanggal '+hariTransaksiData.record.HARITRANSAKSI_TANGGAL+', Kendaraan '+transaksiData.record.KENDARAAN_NOMORPOLISI+', Pengemudi '+trayekData.record.PENGEMUDI_NAMA,
																			actions: {
																				listAction: base_url+'index.php/transaksi/rekapitulasi/getrekapitulasitrayekbydetailtransaksi?DETAILTRANSAKSIANGKUTSAMPAH_ID='+trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID,
																				createAction: base_url+'index.php/transaksi/rekapitulasi/createrekapitulasitrayek',
																				updateAction: base_url+'index.php/transaksi/rekapitulasi/updaterekapitulasitrayek',
																				deleteAction: base_url+'index.php/transaksi/rekapitulasi/deleterekapitulasitrayek'
																			},
																			fields: {
																				DETAILTRANSAKSIANGKUTSAMPAH_ID: {
																					type: 'hidden',
																					defaultValue: trayekData.record.DETAILTRANSAKSIANGKUTSAMPAH_ID
																				},
																				TRAYEK_ID: {
																					key: true,
																					create: false,
																					edit: false,
																					title: 'ID'
																				},
																				TRAYEK_NAMA: {
																					title: 'Nama',
																					edit: false,
																					create: false
																				},
																				KATEGORI_SPOT_ASAL_ID: {
																					title: 'Kategori Rute Asal',
																					list: false,
																					options: base_url+'index.php/transaksi/rekapitulasi/getkategorispot'	
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
																	                            url: base_url+'index.php/transaksi/rekapitulasi/getspotbykategorispot?kategoriSpotID=0',
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
																                        return base_url+'index.php/transaksi/rekapitulasi/getspotbykategorispot?kategoriSpotID='+ data.dependedValues.KATEGORI_SPOT_ASAL_ID;		    		
																                    }
																				},
																				KATEGORI_SPOT_TUJUAN_ID: {
																					title: 'Kategori Rute Tujuan',
																					list: false,
																					options: base_url+'index.php/transaksi/rekapitulasi/getkategorispot'	
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
																	                            url: base_url+'index.php/transaksi/rekapitulasi/getspotbykategorispot?kategoriSpotID=0',
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
																						return base_url+'index.php/transaksi/rekapitulasi/getspotbykategorispot?kategoriSpotID='+ data.dependedValues.KATEGORI_SPOT_TUJUAN_ID;			
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
																				TRAYEK_KMTARGET: {
																					title: 'KM Target',
																					edit: false,
																					create: false
																				},
																				TRAYEK_KMREALISASI: {
																					title: 'KM Realisasi'
																				},
																				TRAYEK_WAKTUTARGET: {
																					title: 'Waktu Target',
																					edit: false,
																					create: false
																				},
																				TRAYEK_WAKTUREALISASI: {
																					title: 'Waktu Realisasi'
																				},
																				TRAYEK_BERATKOSONGKENDARAAN: {
																					title: 'Berat Kosong Kendaraan',
																					visibility: 'hidden',
																					edit: false,
																					create: false
																				},
																				TRAYEK_BERATKOTORTIMBANGAN: {
																					title: 'Berat Kotor Timbangan',
																					visibility: 'hidden',
																					edit: false,
																					create: false
																				},
																				TRAYEK_BERATBERSIHSAMPAH: {
																					title: 'Berat Bersih Sampah'
																				},
																				TRAYEK_JUMLAHISIBBMDIAJUKAN: {
																					title: 'BBM Diajukan',
																					edit: false,
																					create: false
																				},
																				TRAYEK_JUMLAHISIBBMDISETUJUI: {
																					title: 'BBM Disetujui'
																				},
																				STATUSTRAYEK_ID: {
																					title: 'Status',
																					list: false,
																					options: function () {
															                        if (cachedStatusTrayekOptions) { //Check for cache
															                            return cachedStatusTrayekOptions;
															                        }
															                        var options = [];
															 
															                        $.ajax({ //Not found in cache, get from server
															                            url: base_url+'index.php/transaksi/rekapitulasi/getstatustrayek',
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
															                         
															                        return cachedStatusTrayekOptions = options;
															                    }
																				},
																				STATUSTRAYEK_NAMA: {
																					title: 'Status',
																					edit: false,
																					create: false
																				},
																				TRAYEK_WAKTUENTRIREALISASI: {
																					title: 'Waktu Entry',
																					edit: false,
																					create: false,
																					visibility:false
																				},
																				TRAYEK_KETERANGAN: {
																					title: 'Keterangan'
																				}
																			},
																			formCreated: function (event, data2) 
																            {										
																				var $input_waktuRealisasi = data2.form.find ('input[name="TRAYEK_WAKTUREALISASI"]');
																				$input_waktuRealisasi.datetimepicker({
																					mask:'9999-19-39 29:59:59',
																					format:'Y-m-d H:i:s'	
																				});
																            },
																			recordUpdated: function (event, data2) {
																				data2.row.closest('.jtable-child-table-container').jtable('reload');
																			}
																		},function (data){				
																			data.childTable.jtable('load');
																		});
																	});     
																	return $iconTrayek;
																}
															},
															PENGEMUDI_NAMA: {
																title: 'Pengemudi',
																edit: false,
																create: false
															},
															SPOT_POOL_ID: {
																title: 'Pool',
																list:false,
											                    options: base_url+'index.php/transaksi/rekapitulasi/getpool'
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
												                            url: base_url+'index.php/transaksi/rekapitulasi/getpengemudi?poolID=0',
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
											                        return base_url+'index.php/transaksi/rekapitulasi/getpengemudi?poolID='+ data.dependedValues.SPOT_POOL_ID;						                       
											                    }
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG: {
																title: 'KM Target Berangkat',
																visibility: 'hidden',
																create: false,
																edit: false
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG: {
																title: 'KM Realisasi Berangkat',
																visibility: 'hidden'
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG: {
																title: 'KM Target Kembali',
																visibility: 'hidden',
																create: false,
																edit: false
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG: {
																title: 'KM Realisasi Kembali',
																visibility: 'hidden'
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG: {
																title: 'Waktu Target Berangkat',
																visibility: 'hidden',
																create: false,
																edit: false
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG: {
																title: 'Waktu Realisasi Berangkat',
																visibility: 'hidden'
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG: {
																title: 'Waktu Target Kembali',
																visibility: 'hidden',
																create: false,
																edit: false
															},
															DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG: {
																title: 'Waktu Realisasi Kembali',
																visibility: 'hidden'
															},
															STATUSDETAILTRANSAKSIANGKUTSAMPAH_NAMA: {
																title: 'Status',
																edit: false,
																create: false
															},
															STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID: {
																title: 'Status',
																list: false,
																options: function () {
											                        if (cachedStatusDetailTransaksiOptions) { //Check for cache
											                            return cachedStatusDetailTransaksiOptions;
											                        }
											                        var options = [];
											 
											                        $.ajax({ //Not found in cache, get from server
											                            url: base_url+'index.php/transaksi/rekapitulasi/getstatusdetailtransaksi',
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
											                         
											                        return cachedStatusDetailTransaksiOptions = options;
											                    }
															},
															DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN: {
																title: 'Keterangan'
															}
														},
														formCreated: function (event, data2) 
											            {										
															var $input_rekapWaktuRealisasiBerangkat = data2.form.find ('input[name="DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG"]');
															
															$input_rekapWaktuRealisasiBerangkat.datetimepicker({
																mask:'9999-19-39 29:59:59',
																format:'Y-m-d H:i:s'	
															});
															
															var $input_rekapWaktuRealisasiKembali = data2.form.find ('input[name="DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG"]');
															
															$input_rekapWaktuRealisasiKembali.datetimepicker({
																mask:'9999-19-39 29:59:59',
																format:'Y-m-d H:i:s'
															});
											            },
														recordUpdated: function (event, data2) {
															data2.row.closest('.jtable-child-table-container').jtable('reload');
														}
													},function (data){				
														data.childTable.jtable('load');
												    });
												});     
												return $iconDetailTransaksi;
											}
										},
										KENDARAAN_NOMORPOLISI:{
											title: 'Nopol',
											create: false,
											edit: false
										},
										SPOT_POOL_ID:{
											title: 'Pool',
											list:false,
						                    options: base_url+'index.php/transaksi/rekapitulasi/getpool'
										},
										KENDARAAN_ID: {
											title: 'Nopol',
											dependsOn: 'SPOT_POOL_ID',
											list:false,
											options: function (data) {	
												if (data.source == 'list') {
													if (cachedKendaraanOptions) { //Check for cache
							                            return cachedKendaraanOptions;
							                        }
							                        var options = [];
							 
							                        $.ajax({ 
							                            url: base_url+'index.php/transaksi/rekapitulasi/getkendaraan?poolID=0',
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
							                         
							                        return cachedKendaraanOptions = options;
						                        }
						                        return base_url+'index.php/transaksi/rekapitulasi/getkendaraan?poolID='+ data.dependedValues.SPOT_POOL_ID;						                       
						                    }
										},
										APLIKASIKENDARAAN_NAMA: {
											title: 'Aplikasi',
						                    edit: false,
						                    create: false
										},
										KATEGORIKENDARAAN_MERK: {
											title: 'Merk',
						                    edit: false,
						                    create: false
										},
										SPOT_NAMA: {
											title: 'Pool',
						                    edit: false,
						                    create: false
										},
										KATEGORISUMBERSAMPAH_NAMA: {
											title: 'Kode',
						                    edit: false,
						                    create: false
										},
										STATUSTRANSAKSIANGKUTSAMPAH_NAMA: {
											title: 'Status',
											edit: false,
						                    create: false
										},
										STATUSTRANSAKSIANGKUTSAMPAH_ID: {
											title: 'Status',
											list: false,
											options: function () {
						                        if (cachedStatusTransaksiOptions) { //Check for cache
						                            return cachedStatusTransaksiOptions;
						                        }
						                        var options = [];
						 
						                        $.ajax({ //Not found in cache, get from server
						                            url: base_url+'index.php/transaksi/rekapitulasi/getstatustransaksi',
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
						                         
						                        return cachedStatusTransaksiOptions = options;
						                    }
										},
										TRANSAKSIANGKUTSAMPAH_KETERANGAN: {
											title: 'Keterangan'
										}	
                           			},									
									recordUpdated: function (event, data2) {
										data2.row.closest('.jtable-child-table-container').jtable('reload');
									}
                                }, function (data) { //opened handler
                                    data.childTable.jtable('load');
                                });
                        });
                        return $iconTransaksi;
                    }
                },
				HARITRANSAKSI_TANGGAL: {
					title: 'Tanggal'
                },
				STATUSHARITRANSAKSI_NAMA: {
					title: 'Status',					
                }
            }
        });
		//$('#RekapitulasiTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#statusHariTransaksi').val()+" "+$('#tanggalHariTransaksi').val());
            $('#RekapitulasiTableContainer').jtable('load', {
                statusHariTransaksi: $('#statusHariTransaksi').val(),
                tanggalHariTransaksi: $('#tanggalHariTransaksi').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/rekapitulasi'; ?>">Rekapitulasi</a></li>
		<li class="active"><a href="#">Hari</a></li>
    </ul>
</nav>
</br>
<legend>Rekapitulasi Kendaraan</legend>
<div class="filtering">
    <form>
		Tanggal :
		<div class="input-control text" style="width: 200px">
			<input type="text" name="tanggalHariTransaksi" id="tanggalHariTransaksi" placeholder="Tanggal" value="<?php echo date('Y-m')?>"/>
		</div>
        Status :
		<div class="input-control select" style="width: 200px"> 
	        <select id="statusHariTransaksi" name="statusHariTransaksi">
	            <option selected="selected" value="0">All Status</option>
				<?php
		       		foreach($all_statusharitransaksi->result() as $row)
		       		{
						echo '<option value="'.$row->STATUSHARITRANSAKSI_ID.'">'.$row->STATUSHARITRANSAKSI_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="RekapitulasiTableContainer"></div>