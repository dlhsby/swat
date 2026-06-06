<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedKategoriSumberSampahOptions = null;
		var cachedKendaraanOptions = null;
        $('#KategorisumbersampahkendaraanTableContainer').jtable({
            title: 'Daftar Kategori Sumber Sampah Kendaraan',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'KENDARAAN_NOMORPOLISI ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/getkategorisumbersampahkendaraan_by_filter',
				createAction: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/createkategorisumbersampahkendaraan',
				updateAction: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/updatekategorisumbersampahkendaraan',
                deleteAction: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/deletekategorisumbersampahkendaraan'
            },
            fields: {
                KATEGORISUMBERSAMPAHKENDARAAN_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				SPOT_NAMA:{
					title: 'Pool',
					edit: false,
					create: false
				},
				SPOT_POOL_ID:{
					title: 'Pool',
					list:false,
                    options: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/getpool'
				},
				KENDARAAN_NOMORPOLISI:{
					title: 'Nomor Polisi',
					edit: false,
					create: false
				},
				KENDARAAN_ID: {
					title: 'Nomor Polisi',
					dependsOn: 'SPOT_POOL_ID',
					list:false,
					options: function (data) {	
						if (data.source == 'list') {
							if (cachedKendaraanOptions) { //Check for cache
	                            return cachedKendaraanOptions;
	                        }
	                        var options = [];
	 
	                        $.ajax({ 
	                            url: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/getkendaraan?poolID=0',
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
	                         
	                        return cachedKendaraanOptions = options;
                        }
                        return base_url+'index.php/masterdata/kategorisumbersampahkendaraan/getkendaraan?poolID='+ data.dependedValues.SPOT_POOL_ID;						                       
                    }												
                },
				KATEGORISUMBERSAMPAH_NAMA: {
					title: 'Kode',
					edit: false,
					create: false
				},
				KATEGORISUMBERSAMPAH_ID: {
					title: 'Kode',
					list: false,
					options: function () {
                        if (cachedKategoriSumberSampahOptions) { //Check for cache
                            return cachedKategoriSumberSampahOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/kategorisumbersampahkendaraan/getkategorisumbersampah',
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
                         
                        return cachedKategoriSumberSampahOptions = options;
                    }									
                }				
            },
			recordUpdated: function (event, data) {
				$('#KategorisumbersampahkendaraanTableContainer').jtable('reload');
			}
        });
		//$('#KategorisumbersampahkendaraanTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#nopolKendaraan').val()+" "+$('#poolKendaraan').val()+" "+$('#kodeKendaraan').val());
            $('#KategorisumbersampahkendaraanTableContainer').jtable('load', {
                nopolKendaraan: $('#nopolKendaraan').val(),
				poolKendaraan: $('#poolKendaraan').val(),
                kodeKendaraan: $('#kodeKendaraan').val()
            });
        });
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Kategori Sumber Sampah Kendaraan</legend>
<div class="filtering">
    <form>
		Nopol :
		<div class="input-control text" style="width: 120px">
			<input type="text" name="nopolKendaraan" id="nopolKendaraan" placeholder="Nomor Polisi" />
		</div>
		Pool :
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
		Kode :
		<div class="input-control select" style="width: 100px"> 
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
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="KategorisumbersampahkendaraanTableContainer"></div>