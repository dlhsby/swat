<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var site_url = "<?php echo site_url()?>";
		var base_url = "<?php echo base_url()?>";
		var cachedKendaraanOptions = null;
		var cachedPersilOptions = null;
		var cachedStatusJatahKitirOptions = null;
		
		$('#jumlahkitir').val('1');
		$('#tanggalDiterbitkan').datetimepicker({
			mask:'9999-19-39',
			format:'Y-m-d',
			timepicker:false
			
		});
		$('#image_button_tanggalDiterbitkan').click(function(){
		  $('#tanggalDiterbitkan').datetimepicker('show'); //support hide,show and destroy command
		});
		$('#awalmasaberlakuwaktu').datetimepicker({
			mask:'9999-19-39',
			format:'Y-m-d',
			timepicker:false,
			closeOnDateSelect:true
			
		});
		$('#image_button_awalmasaberlakuwaktu').click(function(){
		  $('#awalmasaberlakuwaktu').datetimepicker('show'); //support hide,show and destroy command
		});
		$('#akhirmasaberlakuwaktu').datetimepicker({
			mask:'9999-19-39',
			format:'Y-m-d',
			timepicker:false,
			closeOnDateSelect:true
			
		});
		$('#image_button_akhirmasaberlakuwaktu').click(function(){
		  $('#akhirmasaberlakuwaktu').datetimepicker('show'); //support hide,show and destroy command
		});
		$('#kendaraan').autocomplete({
			serviceUrl: site_url+'/transaksi/jatahkitir/getkendaraan',
			minChars:0
		});
		$('#tps').autocomplete({
			serviceUrl: site_url+'/transaksi/jatahkitir/gettps',
			minChars:0
		});
		$('#JatahKitirTableContainer').jtable({
	        title: 'Penerbitan Jatah Kitir',
	        paging: true,
	        pageSize: 10,
	        sorting: true,
	        defaultSorting: 'JATAHKITIR_WAKTUDITERBITKAN DESC',
	        columnResizable: true, //Actually, no need to set true since it's default
	        columnSelectable: true, //Actually, no need to set true since it's default
	        saveUserPreferences: true, //Actually, no need to set true since it's default
	        actions: {
	            listAction: site_url + '/transaksi/jatahkitir/getAllJatahKitirByFilter'
	        },
	        fields: {
	        	JATAHKITIR_WAKTUDITERBITKAN: {
	                title: 'Waktu Diterbitkan',
	                edit: false
	            },
	            JATAHKITIR_ID: {
	                key: true,
	                title: 'Kode Barcode'
	            },
	            KENDARAAN_ID: {
	                title: 'Nomor Polisi',
	                list: false,
	                options: function () {
                        if (cachedKendaraanOptions) { //Check for cache
                            return cachedKendaraanOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/transaksi/jatahkitir/getlistkendaraan',
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
                         
                        return cachedKendaraanOptions = options;
                    }
	            },
	            KENDARAAN_NOMORPOLISI: {
	                title: 'Nomor Polisi',
	                edit: false
	            },
	            SPOT_ID: {
	                title: 'Persil',
	                list: false,
	                options: function () {
                        if (cachedPersilOptions) { //Check for cache
                            return cachedPersilOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/transaksi/jatahkitir/getlistpersil',
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
                         
                        return cachedPersilOptions = options;
                    }
	            },
	            SPOT_NAMA: {
	                title: 'Persil',
	                edit: false
	            },
	            STATUSJATAHKITIR_ID: {
	                title: 'Status',
	                list: false,
					options: function () {
                        if (cachedStatusJatahKitirOptions) { //Check for cache
                            return cachedStatusJatahKitirOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/transaksi/jatahkitir/getliststatusjatahkitir',
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
                         
                        return cachedStatusJatahKitirOptions = options;
                    }
	            },
	            STATUSJATAHKITIR_NAMA: {
	                title: 'Status',
	                edit: false
	            },
	            JATAHKITIR_MASABERLAKUAWAL: {
	                title: 'Awal Masa Berlaku'
	            },
	            JATAHKITIR_MASABERLAKUAKHIR: {
	                title: 'Akhir Masa Berlaku'
	            } 
	        },
			formCreated: function (event, data) 
            {
                var $input_awalmasaberlaku = data.form.find ('input[name="JATAHKITIR_MASABERLAKUAWAL"]');
				$input_awalmasaberlaku.datetimepicker({
					mask:'9999-19-39',
					format:'Y-m-d',
					timepicker:false,
					closeOnDateSelect:true
				});
				
				var $input_akhirmasaberlaku = data.form.find ('input[name="JATAHKITIR_MASABERLAKUAKHIR"]');
				
				$input_akhirmasaberlaku.datetimepicker({
					mask:'9999-19-39',
					format:'Y-m-d',
					timepicker:false,
					closeOnDateSelect:true
				});
            },
			recordUpdated: function (event, data) {
				$('#JatahKitirTableContainer').jtable('reload');
			}
	    });
		$('#LoadRecordsButton').click(function (e) {
	        e.preventDefault();
	        console.log("ID Jatah Kitir: " + $('#idJatahKitir').val()+ " , Waktu Diterbikan: " + $('#tanggalDiterbitkan').val()+ " , Nopol: " + $('#nopolKendaraan').val()+ " , tpsList: " + $('#tpsList').val()+ " , statusJatahKitir: " + $('#statusJatahKitir').val());
	        $('#JatahKitirTableContainer').jtable('load', {	            
	            idJatahKitir: $('#idJatahKitir').val(),
	            tanggalDiterbitkan: $('#tanggalDiterbitkan').val(),
	            nopolKendaraan: $('#nopolKendaraan').val(),
	            tpsList: $('#tpsList').val(),
	            statusJatahKitir: $('#statusJatahKitir').val()
	        });
	    });
	    $('#LoadRecordsButton').click();
	});
</script>
<nav class="breadcrumbs">
    <ul>
		<li><a href="<?php echo base_url(); ?>"><i class="icon-home"></i></a></li>
        <li><a href="<?php echo base_url(); ?>">Home</a></li>
        <li><a href="<?php echo base_url(); ?>">Transaksi</a></li>
        <li class="active"><a href="#">Jatah Kitir</a></li>
    </ul>
</nav>
</br>

<?php 
	echo form_open_multipart('transaksi/jatahkitir','class="form-horizontal"');
?>
	<legend>Penerbitan Jatah Kitir</legend>
	<table cellspacing="200" >
	<tr>
		<td align="left">
			<label class="control-label">Nomor Polisi</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'kendaraan', 'id' => 'kendaraan', 'class' => 'autocomplete','style'=>'width:300px;', 'value' => set_value('kendaraan'), 'placeholder' => 'Nomor Polisi']); echo form_error('kendaraan');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Persil Asal Sampah</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
				<?php echo form_input(['name' => 'tps', 'id' => 'tps', 'class' => 'autocomplete','style'=>'width:300px;', 'value' => set_value('tps'), 'placeholder' => 'Nama Persil']); echo form_error('tps');?>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Awal Masa Berlaku</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'awalmasaberlakuwaktu', 'id' => 'awalmasaberlakuwaktu','value' => set_value('awalmasaberlakuwaktu')]); echo form_error('awalmasaberlakuwaktu');?>
				<span id="image_button_awalmasaberlakuwaktu" class="btn-date"></span>
			</div>
		</td>
	</tr>
	<tr>
		<td align="left">
			<label class="control-label">Akhir Masa Berlaku</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'akhirmasaberlakuwaktu', 'id' => 'akhirmasaberlakuwaktu','value' => set_value('akhirmasaberlakuwaktu')]); echo form_error('akhirmasaberlakuwaktu');?>
				<span id="image_button_akhirmasaberlakuwaktu" class="btn-date"></span>
			</div>
		</td>
	</tr>	
	<tr>
		<td align="left">
			<label class="control-label">Jumlah Kitir</label>			
		</td>
		<td width="50px" align="center">:
		</td>
		<td>
			<div class="input-control text">
			    <?php echo form_input(['name' => 'jumlahkitir', 'id' => 'jumlahkitir','value' => set_value('jumlahkitir')]); echo form_error('jumlahkitir');?>
			</div>
		</td>
	</tr>				
	<tr>
		<td></td>
		<td></td>
		<td>
			<button class="btn btn-primary" type="submit" value="upload">Simpan</button>
		</td>
	</tr>
	</table>
<?php	
	echo form_close();
?>
</br>
</br>
<legend>Daftar Terbitan Jatah Kitir Hari Ini</legend>
<div class="filtering">
    <form>
		<table width="100%" align="center">
			<tr valign="middle">
				<td width="10%" align="right" >Kode Barcode</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px;vertical-align: middle;" >
						<input type="text" name="idJatahKitir" id="idJatahKitir" placeholder="Kode Barcode" />
					</div>
				</td>
				<td width="10%" align="right" >Tanggal Diterbitkan</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px"> 
				        <input type="text" name="tanggalDiterbitkan" id="tanggalDiterbitkan" />
                        <span id="image_button_tanggalDiterbitkan" class="btn-date"></span>
					</div>
				</td>
				<td width="10%" align="right">Status</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width: 150px"> 
				        <select id="statusJatahKitir" name="statusJatahKitir">
				            <option selected="selected" value="0">All Status</option>
							<?php
					       		foreach($all_statusjatahkitir->result() as $row)
					       		{
									echo '<option value="'.$row->STATUSJATAHKITIR_ID.'">'.$row->STATUSJATAHKITIR_NAMA.'</option>';
					       		}
				    		?>
				        </select>
					</div>
				</td>
			</tr>
			<tr valign="middle">
			<td width="10%" align="right" >Nopol</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left" valign="middle">
					<div class="input-control text" style="width: 150px;vertical-align: middle;" >
						<input type="text" name="nopolKendaraan" id="nopolKendaraan" placeholder="Nomor Polisi" />
					</div>
				</td>	
				<td width="10%" align="right">TPS</td>
				<td width="2%" align="center">:</td>
				<td width="20%" align="left">
					<div class="input-control select" style="width: 150px">
	                    <select id="tpsList" name="tpsList">
	                        <option selected="selected" value="0">All TPS</option>
	                        <?php
	                        	foreach ($all_TPS->result() as $row) {
	                            	echo '<option value="' . $row->SPOT_ID . '">' . $row->SPOT_NAMA. '</option>';
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
<div id="JatahKitirTableContainer"></div>