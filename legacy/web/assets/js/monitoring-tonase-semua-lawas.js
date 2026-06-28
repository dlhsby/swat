var base_url = "http://localhost:8090/";
function getTotalJenisSampah(tanggal){
	try{
		var hasil;
	    $.ajax({
			data: {tanggal: tanggal},
	        type: "POST",
	        url: base_url+"index.php/monitoring/tonasesemua/getTonaseJenisSampah",
	        async: false,
	        dataType: 'json',
	        success: function (data) {
	            hasil = data;
	            console.log(data);
	        }
	    });
	    return hasil;
	} catch (err) {
		console.log("tidak bisa mendapatkan total jenis sampah");
	}

};
function loadTotalJenisSampah(tanggal) {
    try{
		var data = getTotalJenisSampah(tanggal);
	    var options = {
	        series: {
	            pie: {
	                show: true,
	                radius: 1,
	                innerRadius:0.5
	            }
	        },
	        legend: {
	            show: true
	        },
	        grid: {
	            hoverable: true,
	            clickable: true
	        },
	        colors: [ "#D9DD81", "#E67A77","#9972B5","#79D1CF"],
	        tooltip: true,
	        tooltipOpts: {
	            content: "%p.0%, %s", // show percentages, rounding to 2 decimal places
	            shifts: {
	                x: 20,
	                y: 0
	            },
	            defaultTheme: true
	        }
	    };
	    $.plot($("#pie-chart-donut #pie-donutContainer"), data, options);
	} catch (err) {
		console.log("error saat mendapatkan total jenis sampah");
	}

};
function updateTotalJenisSampah(tanggal){
	loadTotalJenisSampah(tanggal);
}

//draw tonase per daerah
function getTonaseLimaHariTPS(tanggal) {
    try{
		var datatabel;
    $.ajax({
		data: {tanggal: tanggal},
        type: "POST",
        url: base_url+"index.php/monitoring/tonasesemua/getTonaseLimaHariTPS",
        dataType: "json",
        async: false,
        success: function (data) {
			console.log("get tonase lima hari tps");
            datatabel = data;
            console.log(datatabel);
        }
    });
    return datatabel;
	} catch (err) {
		console.log();
	}
};
function getNamaTonaseLimaHariTPS(tanggal) {
    try{
		var datatabel;
	    $.ajax({
			data: {tanggal: tanggal},
	        type: "POST",
	        url: base_url+"index.php/monitoring/tonasesemua/getNamaTonaseLimaHariTPS",
	        dataType: "json",
	        async: false,
	        success: function (data) {
				console.log("get nama tonase lima hari tps");
	            console.log(data);
	            datatabel = data;
	        }
	    });
	    return datatabel;
	} catch (err) {
		console.log("tidak bisa mendapatkan nama tonase lima hari tps");
	}

};
function getTonaseLimaHariTotal(tanggal) {
    try{
		var datatabel;
    $.ajax({
		data: {tanggal: tanggal},
        type: "POST",
        url: base_url+"index.php/monitoring/tonasesemua/getTotalTonaseLimaHari",
        dataType: "json",
        async: false,
        success: function (data) {
            datatabel = data;
            console.log(datatabel);
        }
    });
    return datatabel;
	} catch (err) {
		console.log("tidak bisa mendapatkan tonase lima hari total");
	}

};
function loadTonaseLimaHariTPS(tanggal) {
	try{
		// Use Morris.Area instead of Morris.Line
	    var x, y1, y2, y3, y4, y5;
	    var datatabel = getTonaseLimaHariTPS(tanggal);
	    var labely = getNamaTonaseLimaHariTPS(tanggal);
	    ykey = [];
	    $.each(labely, function (i, item) {
	        ykey.push(item.NAMA);
	    });
	    console.log(ykey);
		$('#tonaseLimaHariTPS').html("");
	    Morris.Area({
	        element: 'tonaseLimaHariTPS',
	        padding: 10,
	        behaveLikeLine: true,
	        gridEnabled: false,
	        gridLineColor: '#dddddd',
	        axes: true,
	        fillOpacity: .7,
	        data: datatabel,
	        lineColors: ['#4791FF', '#66FF66', '#D6D23A', '#32D2C9', '#ED5D5D',],
	        xkey: 'TANGGAL',
	        ykeys: ykey,
	        labels: ykey,
	        pointSize: 0,
	        lineWidth: 0,
	        hideHover: 'auto'

	    });
	}
	catch (err) {
		console.log("tidak bisa menampilkan tonase lima hari total");
	}
};

function updateTonaseLimaTPS(tanggal){
	loadTonaseLimaHariTPS(tanggal);
}

function loadTotalTonaseLimaHari(tanggal){
	try{	    //tonase lima hari total
	    datatabel = getTonaseLimaHariTotal(tanggal);
		$('#tonaseLimaHariTotal').html("");
	    new Morris.Bar({
	        element: 'tonaseLimaHariTotal',
	        data: datatabel,
	        xkey: 'TANGGAL',
	        ykeys: ['BERAT'],
	        labels: ['BERAT'],
	        barColors: ['#79D1CF', '#D9DD81', '#E67A77']
	    });
	} catch (err) {
		console.log("tidak bisa menampilkan tonase lima hari total");
	}
}

function updateTotalTonaseLimaHari(tanggal){
	loadTotalTonaseLimaHari(tanggal);
}
//tonase satu bulan
function getTonaseSatuBulanTotal(tanggal) {
    try{
		var datatabel;
    $.ajax({
		data: {tanggal: tanggal},
        type: "POST",
        url: base_url+"index.php/monitoring/tonasesemua/getTotalTonaseSatuBulan",
        dataType: "json",
        async: false,
        success: function (data) {
            datatabel = data;
            console.log(datatabel);
        }
    });
    return datatabel;
	} catch (err) {
		console.log("tidak bisa mendapatkan tonase satu bulan total");
	}

};
function loadTotalTonaseSatuBulan(tanggal){
	try{	    //tonase lima hari total
	    datatabel = getTonaseSatuBulanTotal(tanggal);
		$('#tonaseSatuBulanTotal').html("");
	    new Morris.Bar({
	        element: 'tonaseSatuBulanTotal',
	        data: datatabel,
	        xkey: 'TANGGAL',
	        ykeys: ['BERAT'],
	        labels: ['BERAT'],
	        barColors: ['#79D1CF', '#D9DD81', '#E67A77']
	    });
	} catch (err) {
		console.log("tidak bisa menampilkan tonase satu bulan total");
	}
}
function updateTotalTonaseSatuBulan(tanggal){
	loadTotalTonaseSatuBulan(tanggal);
}

function loadSelisihTonase(tanggal) {
    try{
		$.ajax({
			data: {tanggal: tanggal},
	        type: "POST",
	        url: base_url+"index.php/monitoring/tonasesemua/getSelisihTonase",
	        dataType: "json",
	        async: false,
	        success: function (data) {
	            datatabel = data;
	            $("#tonaseHariIni").html(data.BERAT/1000+' TON');
	            $("#selisihTonase").html(data.SELISIH/1000);
	            if(data.POSISI == "NAIK") $("#persentaseSelisihTonase").html('<i class="fa fa-arrow-up"></i>'+Math.abs(data.PERSEN)+'%');
	            else $("#persentaseSelisihTonase").html('<i class="fa fa-arrow-down"></i>'+Math.abs(data.PERSEN)+'%');
	            console.log(datatabel);
	        }
	    });
	} catch (err) {
		console.log("tidak bisa menampilkan selisih tonase");
	}

};
function updateSelisihTonase(tanggal){
	loadSelisihTonase(bulan,tahun);
}
