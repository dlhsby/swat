function getRetribusi(tanggal)
{
    var datatable;
    $.ajax({
      data:{tanggal: tanggal},
      type: "POST",
      url : base_url+"index.php/monitoring/retribusi/get_retribusi_perbulan",
      dataType:"json",
      async:false;
      success: function(data){
        datatable = data;
        console.log(datatable);
      }
    });
    return datatable;
}

function loadRetribusi(tanggal)
{

    datatable = getRetribusi(tanggal);
    $('#TotalRetribusi').html("");
    new Morris.Bar({
      element: 'TotalRetribusi',
      data : datatable,
      xkey: 'tanggal_retribusi',
      ykey: ['jumlah'],
      labels: ['jumlah'],
      barColors: ['#79D1CF', '#D9DD81', '#E67A77']
    });
}

function updateRetribusi(tanggal)
{
  loadRetribusi(tanggal);
}
