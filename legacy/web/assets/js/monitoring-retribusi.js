function getRetribusi(tanggal)
{
  try{
        var datatable;
    $.ajax({
      data:{tanggal: tanggal},
      type: "POST",
      url : base_url+"index.php/monitoring/retribusi/get_retribusi_perbulan",
      dataType:"json",
      async:false,
      success: function(data){
        datatable = data;
        console.log(datatable);
      }
    });
    return datatable;
  }catch (err){
    console.log('tidak bisa mendapatkan retribusi1');
  }
};

function loadRetribusi(tanggal)
{
  try{	    //tonase lima hari total
      datatable = getRetribusi(tanggal);
    $('#TotalRetribusi').html("");
      new Morris.Line({
          element: 'TotalRetribusi',
          data: datatable,
          xkey: 'TANGGAL',
          ykeys: ['JUMLAH'],
          labels: ['JUMLAH'],
          barColors: ['#79D1CF', '#D9DD81', '#E67A77']
      });
  } catch (err) {
    console.log("tidak bisa menampilkan tonase satu bulan total");
  }

}

function updateRetribusi(tanggal)
{
  loadRetribusi(tanggal);
}
