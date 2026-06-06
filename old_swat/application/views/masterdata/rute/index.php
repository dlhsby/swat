<?php  if ( ! defined('BASEPATH')) exit('No direct script access allowed');?>
<script type="text/javascript">
    $(document).ready(function () {
		var base_url = "<?php echo base_url() ?>";
		var cachedKategoriRuteOptions = null;
		var cachedSpotAsalOptions = null;
		var cachedSpotTujuanOptions = null;
        $('#RuteTableContainer').jtable({
            title: 'Daftar Rute',
			paging: true,
			pageSize: 10,
			sorting: true,
			defaultSorting: 'RUTE_ID ASC',
			columnResizable: true, //Actually, no need to set true since it's default
            columnSelectable: true, //Actually, no need to set true since it's default
            saveUserPreferences: true, //Actually, no need to set true since it's default
            actions: {
                listAction: base_url+'index.php/masterdata/rute/getrutebyfilter',
				createAction: base_url+'index.php/masterdata/rute/createrute',
				updateAction: base_url+'index.php/masterdata/rute/updaterute',
                deleteAction: base_url+'index.php/masterdata/rute/deleterute'
            },
            fields: {
                RUTE_ID: {
                    key: true,
					title: 'ID',
					create: false
                },
				KATEGORIRUTE_ID: {
					title: 'Kategori Rute',
					options: function () {
                        if (cachedKategoriRuteOptions) { //Check for cache
                            return cachedKategoriRuteOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/rute/getkategorirute',
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
                         
                        return cachedKategoriRuteOptions = options;
                    }
                },
				SPOT_ASAL_ID: {
					title: 'Asal',
					options: function () {
                        if (cachedSpotAsalOptions) { //Check for cache
                            return cachedSpotAsalOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/rute/getspotasal',
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
                         
                        return cachedSpotAsalOptions = options;
                    }
                },
				SPOT_TUJUAN_ID: {
					title: 'Tujuan',
					options: function () {
                        if (cachedSpotTujuanOptions) { //Check for cache
                            return cachedSpotTujuanOptions;
                        }
                        var options = [];
 
                        $.ajax({ //Not found in cache, get from server
                            url: base_url+'index.php/masterdata/rute/getspottujuan',
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
                         
                        return cachedSpotTujuanOptions = options;
                    }
                },
				RUTE_JARAK: {
					title: 'Jarak'
                }
				
            }
        });
		//$('#RuteTableContainer').jtable('load');
		$('#LoadRecordsButton').click(function (e) {
            e.preventDefault();
			console.log($('#kategoriRute').val()+" "+$('#asalSpot').val()+" "+$('#tujuanSpot').val());
            $('#RuteTableContainer').jtable('load', {
                kategoriRute: $('#kategoriRute').val(),
                asalSpot: $('#asalSpot').val(),
                tujuanSpot: $('#tujuanSpot').val()
            });
        });
 
        $('#LoadRecordsButton').click();
    });
</script>
<legend>Master Data Rute</legend>
<div class="filtering">
    <form>
		Kategori :
		<div class="input-control select" style="width: 200px"> 
	        <select id="kategoriRute" name="kategoriRute">
	            <option selected="selected" value="0">All Kategori Rute</option>
				<?php
		       		foreach($all_kategorirute->result() as $row)
		       		{
						echo '<option value="'.$row->KATEGORIRUTE_ID.'">'.$row->KATEGORIRUTE_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
         Asal :
		<div class="input-control select" style="width: 200px"> 
	        <select id="asalSpot" name="asalSpot">
	            <option selected="selected" value="0">All Asal Spot</option>
				<?php
		       		foreach($all_spot->result() as $row)
		       		{
						echo '<option value="'.$row->SPOT_ID.'">'.$row->SPOT_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
		Tujuan :
		<div class="input-control select" style="width: 200px"> 
	        <select id="tujuanSpot" name="tujuanSpot">
	            <option selected="selected" value="0">All Tujuan Spot</option>
				<?php
		       		foreach($all_spot->result() as $row)
		       		{
						echo '<option value="'.$row->SPOT_ID.'">'.$row->SPOT_NAMA.'</option>';
		       		}
		       		
	    		?>
	        </select>
		</div>
        <button class="primary" type="submit" id="LoadRecordsButton">Load records</button>
    </form>
</div>
<div id="RuteTableContainer"></div>