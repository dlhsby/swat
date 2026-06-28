<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var detailTransaksiID  = "<?php echo $detailTransaksiID ?>";
		var cachedSpotAsalOptions = null;
		var cachedSpotTujuanOptions = null;
		var cachedStatusDetailTransaksiOptions = null;
		var cachedStatusTrayekOptions = null;
        $('#PenjadwalanTrayekTableContainer').jtable({
            title: 'Daftar Penjadwalan Trayek<?php echo ", Detail Transaksi Nomor ".$detailTransaksiID ?>',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'TRAYEK_ID ASC',
			columnResizable: true, 
            columnSelectable: true, 
            saveUserPreferences: true, 
            actions: {
                listAction: base_url+'index.php/transaksi/penjadwalan/getpenjadwalantrayekbyfilter',
				createAction: base_url+'index.php/transaksi/penjadwalan/createpenjadwalantrayek',
				updateAction: base_url+'index.php/transaksi/penjadwalan/updatepenjadwalantrayek',
				deleteAction: base_url+'index.php/transaksi/penjadwalan/deletepenjadwalantrayek'
            },
            fields: {
				DETAILTRANSAKSIANGKUTSAMPAH_ID: {
					type: 'hidden',
					defaultValue: detailTransaksiID
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
					options: base_url+'index.php/transaksi/penjadwalan/getkategorispot'	
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
	                            url: base_url+'index.php/transaksi/penjadwalan/getspotbykategorispot?kategoriSpotID=0',
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
                        return base_url+'index.php/transaksi/penjadwalan/getspotbykategorispot?kategoriSpotID='+ data.dependedValues.KATEGORI_SPOT_ASAL_ID;		    		
                    }
				},
				KATEGORI_SPOT_TUJUAN_ID: {
					title: 'Kategori Rute Tujuan',
					list: false,
					options: base_url+'index.php/transaksi/penjadwalan/getkategorispot'	
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
	                            url: base_url+'index.php/transaksi/penjadwalan/getspotbykategorispot?kategoriSpotID=0',
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
						return base_url+'index.php/transaksi/penjadwalan/getspotbykategorispot?kategoriSpotID='+ data.dependedValues.KATEGORI_SPOT_TUJUAN_ID;			
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
					title: 'KM Target'
				},
				TRAYEK_KMREALISASI: {
					title: 'KM Realisasi',
					edit: false,
					create: false
				},
				TRAYEK_WAKTUTARGET: {
					title: 'Waktu Target'
				},
				TRAYEK_WAKTUREALISASI: {
					title: 'Waktu Realisasi'
				},
				TRAYEK_BERATKOSONGKENDARAAN: {
					title: 'Berat Kosong Kendaraan',
					visibility: 'hidden'
				},
				TRAYEK_BERATKOTORTIMBANGAN: {
					title: 'Berat Kotor Timbangan',
					visibility: 'hidden'
				},
				TRAYEK_BERATBERSIHSAMPAH: {
					title: 'Berat Bersih Sampah'
				},
				TRAYEK_JUMLAHISIBBMDIAJUKAN: {
					title: 'BBM Diajukan'
				},
				TRAYEK_JUMLAHISIBBMDISETUJUI: {
					title: 'BBM Disetujui',
					edit: false,
					create: false
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
                            url: base_url+'index.php/transaksi/penjadwalan/getstatustrayek',
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
				TRAYEK_WAKTUENTRIPENJADWALAN: {
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
				var $input_waktuTarget = data2.form.find ('input[name="TRAYEK_WAKTUTARGET"]');
				$input_waktuTarget.datetimepicker({
					mask:'9999-19-39 29:59:59',
					format:'Y-m-d H:i:s'	
				});

				var $input_waktuRealisasi = data2.form.find ('input[name="TRAYEK_WAKTUREALISASI"]');
				$input_waktuRealisasi.datetimepicker({
					mask:'9999-19-39 29:59:59',
					format:'Y-m-d H:i:s'	
				});
            },
			recordUpdated: function (event, data2) {
				$('#PenjadwalanTrayekTableContainer').jtable('reload');
			}
        });
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#detailTransaksiID').val()+" "+$('#statusTrayek').val());
            $('#PenjadwalanTrayekTableContainer').jtable('load', {
				detailTransaksiID: $('#detailTransaksiID').val(),			               
                statusTrayek: $('#statusTrayek').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/penjadwalan'; ?>">Penjadwalan</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/penjadwalan/hari'; ?>">Hari</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/penjadwalan/transaksi/'.$hariTransaksiTanggal; ?>">Transaksi</a></li>
		<li><a href="<?php echo base_url().'index.php/transaksi/penjadwalan/detailtransaksi/'.$transaksiID; ?>">Detail Transaksi</a></li>
		<li class="active"><a href="#">Trayek</a></li>
    </ul>
</nav>
</br>
<legend>Penjadwalan Trayek<?php echo ', Detail Transaksi Nomor '.$detailTransaksiID ?></legend>
<div class="filtering">
    <form>
		Detail Transaksi :
		<div class="input-control text" style="width: 150px">
			<?php if($detailTransaksiID!=''){				
					echo form_input(['name' => 'detailTransaksiID', 'id' => 'detailTransaksiID','value' => $detailTransaksiID]);
				}
				else 
					echo form_input(['name' => 'detailTransaksiID', 'id' => 'detailTransaksiID','value' => set_value('detailTransaksiID'),'placeholder' => 'ID Detail Transaksi']);
			?>
		</div>		
        Status :
		<div class="input-control select" style="width: 150px"> 
	        <select id="statusTrayek" name="statusTrayek">
	            <option selected="selected" value="0">All Status</option>
				<?php
		       		foreach($all_statustrayek->result() as $row)
		       		{
						echo '<option value="'.$row->STATUSTRAYEK_ID.'">'.$row->STATUSTRAYEK_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="PenjadwalanTrayekTableContainer"></div>