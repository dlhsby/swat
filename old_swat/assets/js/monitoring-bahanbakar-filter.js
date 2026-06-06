var base_url = "http://dkp.surabaya.go.id/swat/";
var gauge = null;
function getTotalBahanBakar(bulan,tahun) {
    var hasil;
    $.ajax({
		data: {tanggal: tanggal},
        type: "POST",
        url: base_url+"index.php/monitoring/bahanbakar/getTotalBahanBakarBulan",
        async: false,
        dataType: 'json',
        success: function (data) {
            hasil = data;
            console.log(data);
        }
    });
    return hasil;

}
function loadTotalBahanBakar(tanggal) {
    /*Knob*/
	try{
		var data = getTotalBahanBakar(tanggal);

	    var opts = {
	        lines: 12, // The number of lines to draw
	        angle: 0, // The length of each line
	        lineWidth: 0.48, // The line thickness
	        pointer: {
	            length: 0.6, // The radius of the inner circle
	            strokeWidth: 0.03, // The rotation offset
	            color: '#464646' // Fill color
	        },
	        limitMax: 'true', // If true, the pointer will not go past the end of the gauge
	        colorStart: '#fa8564', // Colors
	        colorStop: '#fa8564', // just experiment with them
	        strokeColor: '#F1F1F1', // to see which ones work best for you
	        generateGradient: true
	    };


	    var target = document.getElementById('bahanbakarHariIni'); // your canvas element
	    gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
	    gauge.maxValue = 7500; // set max gauge value
	    gauge.animationSpeed = 32; // set animation speed (32 is default value)
		gauge.set(100);
	    gauge.set(data.TOTAL_HARI); // set actual value
	    gauge.setTextField(document.getElementById("gauge-textfield"));
	}
	catch(err){
		console.log("tidak bisa mengambil data Total Bahan Bakar")
	}
};

function updateTotalBahanBakar(bulan,tahun)
{
	try{
		var data = getTotalBahanBakar(bulan,tahun);
		gauge.set(data.TOTAL_HARI); // set actual value
	}
	catch(e){
		console.log("tidak bisa update data total bahan bakar");
	}

}

//bahan bakar satu bulan
function getBahanBakarSatuBulanTotal(tanggal) {
    try{
		var datatabel;
    $.ajax({
		data: {tanggal: tanggal},
        type: "POST",
        url: base_url+"index.php/monitoring/bahanbakar/getTotalBahanBakarSatuBulan",
        dataType: "json",
        async: false,
        success: function (data) {
            datatabel = data;
            console.log(datatabel);
        }
    });
    return datatabel;
	} catch (err) {
		console.log("tidak bisa mendapatkan bahan bakar satu bulan total");
	}

};
function loadTotalBahanBakarSatuBulan(tanggal){
	try{	    //bahan bakar lima hari total
	    datatabel = getBahanBakarSatuBulanTotal(tanggal);
		$('#bahanBakarSatuBulanTotal').html("");
	    new Morris.Bar({
	        element: 'bahanBakarSatuBulanTotal',
	        data: datatabel,
	        xkey: 'TANGGAL',
	        ykeys: ['BERAT'],
	        labels: ['BERAT'],
	        barColors: ['#79D1CF', '#D9DD81', '#E67A77']
	    });
	} catch (err) {
		console.log("tidak bisa menampilkan bahan bakar satu bulan total");
	}
}
function updateTotalBahanBakarSatuBulan(tanggal){
	loadTotalBahanBakarSatuBulan(tanggal);
}

// DONUT


//list kendaraan aktif
/*function getTotalJenisKendaraanAktif(){

};*/

// total bahan bakar
function loadPenggunaanBahanBakar() {
    $('#bulanTransaksi').datetimepicker({
        mask: '9999-19',
        format: 'Y-m',
        timepicker: false,
        closeOnDateSelect: true

    });
    $('#image_button_bulanTransaksi').click(function () {
        $('#bulanTransaksi').datetimepicker('show'); //support hide,show and destroy command
    });
    $('#tanggalTransaksi').datetimepicker({
        mask: '9999-19-39',
        format: 'Y-m-d',
        timepicker: false,
        closeOnDateSelect: true

    });
    $('#image_button_tanggalTransaksi').click(function () {
        $('#tanggalTransaksi').datetimepicker('show'); //support hide,show and destroy command
    });
    $('#aplikasiKendaraan').on('change', function (e) {
        var optionSelected = $("option:selected", this);
        var valueSelected = this.value;
        console.log("value aplikasiKendaraan selected : " + valueSelected);
        if (valueSelected == 0) {
            $("#kategoriKendaraan").empty();
            $('#containerKategoriKendaraan').hide();
        }
        else {
            $('#containerKategoriKendaraan').show();
            $.ajax({
                type: "POST",
                url: base_url+"index.php/monitoring/bahanbakar/getKategoriKendaraanByAplikasi",
                data: "aplikasiKendaraanNama=" + valueSelected,
                success: function (data) {
                    if (data.length > 0) {
                        console.log(data);
                        $("#kategoriKendaraan").html(data);
                    }
                    else console.log("kosong");

                }
            });
        }
    });
    $('#jenisWaktu').on('change', function (e) {
        var optionSelected = $("option:selected", this);
        var valueSelected = this.value;
        console.log("value jenisWaktu selected : " + valueSelected);
        $('#containerBulan').hide();
        $('#bulanTransaksi').val("");
        $('#containerMinggu').hide();
        $('#mingguTransaksi').val(0);
        $('#containerTanggal').hide();
        $('#tanggalTransaksi').val("");
        if (valueSelected == 1) {
            $('#containerBulan').show('fade');
            $('#containerMinggu').hide();
            $('#containerTanggal').hide();
        }
        else if (valueSelected == 2) {
            $('#containerBulan').show('fade');
            $('#containerMinggu').show('fade');
            $('#containerTanggal').hide();
        }
        else if (valueSelected == 3) {
            $('#containerBulan').hide();
            $('#containerMinggu').hide();
            $('#containerTanggal').show('fade');
        }
        else {
            $('#containerBulan').hide();
            $('#containerMinggu').hide();
            $('#containerTanggal').hide();
        }
    });

    $('#PenggunaanBahanBakarTableContainer').jtable({
        title: 'Penggunaan Bahan Bakar',
        paging: true,
        pageSize: 10,
        sorting: true,
        defaultSorting: 'KENDARAAN_NOMORPOLISI ASC',
        columnResizable: true, //Actually, no need to set true since it's default
        columnSelectable: true, //Actually, no need to set true since it's default
        saveUserPreferences: true, //Actually, no need to set true since it's default
        actions: {
            listAction: base_url + 'index.php/monitoring/bahanbakar/getpenggunaanbahanbakarbyfilter'
        },
        fields: {
            HARITRANSAKSI_TANGGAL: {
                title: 'Tanggal'
            },
            TRAYEK_ID: {
                key: true,
                title: 'ID',
                list: false
            },
            KENDARAAN_NOMORPOLISI: {
                title: 'Nopol'
            },
            APLIKASIKENDARAAN_NAMA: {
                title: 'Aplikasi'
            },
            KATEGORIKENDARAAN_MERK: {
                title: 'Kategori'
            },
            BAHANBAKAR_NAMA: {
                title: 'Bahan Bakar'
            },
            JUMLAHBBMDIAJUKAN: {
                title: 'BBM Diajukan'
            },
            JUMLAHBBMDISETUJUI: {
                title: 'BBM Disetujui'
            },
        }
    });
    //$('#PenggunaanBahanBakarTableContainer').jtable('load');
    $('#LoadRecordsButton').click(function (e) {
        e.preventDefault();
        console.log("Jenis Waktu:" + $('#jenisWaktu').val() + " , Bulan: " + $('#bulanTransaksi').val() + " , Minggu: " + $('#mingguTransaksi').val() + " , Tanggal: " + $('#tanggalTransaksi').val() + " , Nopol: " + $('#nopolKendaraan').val() + " , Aplikasi: " + $('#aplikasiKendaraan').val() + " ,Kategori: " + $('#kategoriKendaraan').val() + " , Bahan Bakar: " + $('#bahanBakar').val());
        $('#PenggunaanBahanBakarTableContainer').jtable('load', {
            jenisWaktu: $('#jenisWaktu').val(),
            bulanTransaksi: $('#bulanTransaksi').val(),
            mingguTransaksi: $('#mingguTransaksi').val(),
            tanggalTransaksi: $('#tanggalTransaksi').val(),
            nopolKendaraan: $('#nopolKendaraan').val(),
            aplikasiKendaraan: $('#aplikasiKendaraan').val(),
            kategoriKendaraan: $('#kategoriKendaraan').val(),
            bahanBakar: $('#bahanBakar').val()
        });
    });
    $('#LoadRecordsButton').click();
};
