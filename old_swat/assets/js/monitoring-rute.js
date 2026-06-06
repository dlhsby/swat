function loadTotalJenisKendaraanAktif(tanggal){
	try{
		var hasil = "";
	    var total = 0;
	    $.ajax({
			data: {tanggal: tanggal},
	        type: "POST",
	        url: base_url+"index.php/monitoring/rute/getTotalJenisKendaraanAktif",
	        async: false,
	        dataType: 'json',
	        success: function (data) {
	            $.each(data, function(i, item){
	                hasil+='<li class="small">'+
					item.JENIS_KENDARAAN+': <span class="badge">'+item.TOTAL+'</span></li>';
	                total+=parseInt(item.TOTAL);
	            });
	            console.log(data);
	        }
	    });
	    $("#totalJenisKendaraanAktif").html(hasil);
	    $("#totalKendaraanAktif").html('<span class="sales-count">'+total+'</span> <span class="sales-label">Total Kendaraan</span>');
	} catch (err) {
		console.log("tidak bisa mendapatkan data total jenis kendaraan aktif");
	}

};
function updateTotalJenisKendaraanAktif(tanggal){
	loadTotalJenisKendaraanAktif(tanggal);
};

//dynamic table (RUTE)
function getAllRute(tanggal) {
	try{
		var result;
	    $.ajax({
			data: {tanggal: tanggal},
	        type: "POST",
	        url: base_url+"index.php/monitoring/rute/getAllRute",
	        dataType: "json",
	        async: false,
	        success: function (data) {
	            $.each(data, function(i,item){
	                result+='<tr>'+
	                    '<td><a href="javascript:;" class="rutelink" rel="'+item.ID+'">'+item.NOPOL+'</a></td>'+
	                    '<td>'+item.NAMA+'</td>'+
	                    '<td>'+item.RUTE_ASAL+'</td>'+
	                    '<td>'+item.RUTE_TUJUAN+'</td>'+
	                    '<td class="center hidden-phone">'+item.WAKTU+'</td>'+
						'<td class="center hidden-phone">'+item.TARGET+'</td>'+
						'<td><a href="javascript:;" class="laporan" rel="'+item.NOPOL+'"><span class="icon-mail fg-red on-right on-left"></span></a></td>'+
	                    '</tr>';
	            })
	        }
	    });
	    return result;
	} catch (err) {
		console.log("tidak bisa mendapatkan rute");
	}

};
var jarakRute;
var tpa;
var tanggalGlobal;
function getRuteAntarSpot(data,tanggal){
	try{
		$.ajax({
			data: {NOPOL:data, tanggal:tanggal},
	        type: "POST",
	        url: base_url+"index.php/monitoring/rute/getRuteAntarSpot",
	        dataType: "json",
	        async: false,
	        success: function (data) {
	            console.log(data[0]);
	            jarakRute= data[0];
	        }
	    });
	    calcRoute();
	} catch (err) {
		console.log("tidak bisa menghitung jarak rute");
	}

}
function getLocationTPA(){
	try{
		$.ajax({
	        type: "POST",
	        url: base_url+"index.php/monitoring/rute/getLocationTpa",
	        dataType: "json",
	        async: false,
	        success: function (data) {
				console.log("tpa");
	            console.log(data[0]);
	            tpa= data[0];
	        }
	    });
	} catch (err) {
		console.log("tidak bisa mendapatkan data tpa");
	}
}
function loadAllRute(tanggal) {
	var tanggalGlobal = tanggal;
	$("#tabelRute").html(getAllRute(tanggal));
    $('#ruteIndex').dataTable( {
        "aaSorting": [[ 4, "desc" ]],
		"bDestroy": true
    } );
    $("#tabelRute").on("click",'.rutelink', function(){
		var data = $(this).html();
        getRuteAntarSpot(data,tanggalGlobal);
    });
	$("#tabelRute").on("click",'.laporan', function(){
		var data = $(this).attr('rel');
		var peringatan = "Laporan Pelanggaran untuk supir dengan NOPOL "+data+" telah berhasil di kirim."
        alert(peringatan);
    });
	getLocationTPA();
};
function updateAllRute(tanggal){
	var tanggalGlobal = tanggal;
	$('#ruteIndex').dataTable().fnClearTable();
	$("#tabelRute").html(getAllRute(tanggal));
	$('#ruteIndex').dataTable( {
        "aaSorting": [[ 4, "desc" ]],
		"bDestroy": true
    } );

};
//MAP
var map;
var markers = [];
var directionsDisplay;
var directionsService;
function loadMap() {
    directionsDisplay = new google.maps.DirectionsRenderer();
    directionsService = new google.maps.DirectionsService();
    var mapOptions = {
        zoom: 11,
        center: new google.maps.LatLng(-7.2622977, 112.7585691)
    };
    map = new google.maps.Map(document.getElementById('petaSurabaya'),
        mapOptions);
    directionsDisplay.setMap(map);
//        directionsDisplay.setPanel(document.getElementById("petaDetail"));
};

function calcRoute() {
	console.log(jarakRute.KATEGORI_TUJUAN);
	if(jarakRute.KATEGORI_TUJUAN=="TPS"){
		var start = new google.maps.LatLng(jarakRute.ASAL_RUTE_LATITUDE, jarakRute.ASAL_RUTE_LONGITUDE);
	    var end = new google.maps.LatLng(tpa.TPA_LATITUDE, tpa.TPA_LONGITUDE);
		var tps = new google.maps.LatLng(jarakRute.TUJUAN_RUTE_LATITUDE, jarakRute.TUJUAN_RUTE_LONGITUDE);
	    console.log(jarakRute.ASAL_RUTE_LATITUDE);
		console.log(jarakRute.KATEGORI_TUJUAN);
	    var request = {
        	origin:start,
	        destination:end,
			waypoints:[{location:tps,stopover:true}],
	        travelMode: google.maps.TravelMode.DRIVING,
	        unitSystem: google.maps.UnitSystem.METRIC,
	        durationInTraffic: true,
	        avoidHighways: true,
	        avoidTolls: true
	    };
		console.log(request);
		directionsService.route(request, function(response, status, duration) {
	        if (status == google.maps.DirectionsStatus.OK) {
	            directionsDisplay.setDirections(response);
	            computeTotalDistance(directionsDisplay.getDirections());
	        }
			else{
				console.log('tidak bisa mendapatkan rute map')
			}
	    });
		console.log("masuk tps");
	}
	else{
		var start = new google.maps.LatLng(jarakRute.ASAL_RUTE_LATITUDE, jarakRute.ASAL_RUTE_LONGITUDE);
	    var end = new google.maps.LatLng(jarakRute.TUJUAN_RUTE_LATITUDE, jarakRute.TUJUAN_RUTE_LONGITUDE);
	    console.log(jarakRute.ASAL_RUTE_LATITUDE);
	    var request = {
	        origin:start,
	        destination:end,
	        travelMode: google.maps.TravelMode.DRIVING,
	        unitSystem: google.maps.UnitSystem.METRIC,
	        durationInTraffic: true,
	        avoidHighways: true,
	        avoidTolls: true
	    };
		console.log(request);
		directionsService.route(request, function(response, status, duration) {
	        if (status == google.maps.DirectionsStatus.OK) {
	            directionsDisplay.setDirections(response);
	            computeTotalDistance(directionsDisplay.getDirections());
	        }
			else{
				console.log('tidak bisa mendapatkan rute map')
			}
	    });
		console.log("masuk non-tps");
	}
};
function computeTotalDistance(result) {
	var myroute = result.routes[0];
    var total = parseInt(myroute.legs[0].distance.value);
    var waktu = parseInt(myroute.legs[0].duration.value);
	var totalTPA = (myroute.legs.length>1)?total+parseInt(myroute.legs[1].distance.value):0;
	var waktuTPA = (myroute.legs.lenght>1)?waktu+parseInt(myroute.legs[1].duration.value):0;
    total = (total / 1000.0).toFixed(2);
	totalTPA = (totalTPA / 1000.0).toFixed(2);
    waktu = Math.ceil(total*3);
	waktuTPA = Math.ceil(totalTPA*3);
    //alert(waktu);
    var temp = jarakRute.WAKTU.split(":");
    var jam = parseInt(temp[0]);
    var menit = parseInt(temp[1]);
	var jamTPA = jam;
    var menitTPA = menit;
    menit += waktu;
	menitTPA += waktuTPA;
    if(menit >=60){
        jam = Math.floor(jam +(menit/60));
        menit = menit%60;
    }
	if(menitTPA >=60){
		jamTPA = Math.floor(jamTPA +(menitTPA/60));
		menitTPA = menitTPA%60;
	}
    $("#detailNopol").html(jarakRute.NOPOL);
    $("#detailJarak").html(total+" KM");
    $("#detailWaktuBerangkat").html(jarakRute.WAKTU +" WIB");
	$("#divDetailWaktuSampaiTPA").attr("Class", "col-md-3 hidden");
    $("#detailWaktuSampai").html(leftPad(jam,2)+':'+leftPad(menit,2)+" WIB");
	if(myroute.legs.length>1){
		$("#detailWaktuSampaiTPA").html(leftPad(jamTPA,2)+':'+leftPad(menitTPA,2)+" WIB");
		$("#divDetailWaktuSampaiTPA").attr("Class", "col-md-3 show");
	}


};
function leftPad(number, targetLength) {
    var output = number + '';
    while (output.length < targetLength) {
        output = '0' + output;
    }
    return output;
};
