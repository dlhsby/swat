$(function () {
    /*
     * For the sake keeping the code clean and the examples simple this file
     * contains only the plugin configuration & callbacks.
     * 
     * UI functions ui_* can be located in: demo-ui.js
     */
    var obj = null;

    $('#drag-and-drop-zone').dmUploader({//
        url: 'backend/upload.php',
        maxFileSize: 3000000, // 3 Megs 
        onDragEnter: function () {
            // Happens when dragging something over the DnD area
            this.addClass('active');
        },
        onDragLeave: function () {
            // Happens when dragging something OUT of the DnD area
            this.removeClass('active');
        },
        onInit: function () {
            // Plugin is ready to use
            ui_add_log('Penguin initialized :)', 'info');
        },
        onComplete: function () {
            // All files in the queue are processed (success or error)
            ui_add_log('All pending tranfers finished');
        },
        onNewFile: function (id, file) {
            // When a new file is added using the file selector or the DnD area
            ui_add_log('New file added #' + id);
            ui_multi_add_file(id, file);
        },
        onBeforeUpload: function (id) {
            // about tho start uploading a file

            $('#logupload', window.parent.document).text("Proses upload file excel...");

            ui_add_log('Starting the upload of #' + id);
            ui_multi_update_file_status(id, 'uploading', 'Uploading...');
            ui_multi_update_file_progress(id, 0, '', true);
        },
        onUploadCanceled: function (id) {
            // Happens when a file is directly canceled by the user.
            ui_multi_update_file_status(id, 'warning', 'Canceled by User');
            ui_multi_update_file_progress(id, 0, 'warning', false);
        },
        onUploadProgress: function (id, percent) {
            // Updating file progress
            ui_multi_update_file_progress(id, percent);
        },
        onUploadSuccess: function (id, data) {
            // A file was successfully uploaded
            ui_add_log('Server Response for file #' + id + ': ' + JSON.stringify(data));
            ui_add_log('Upload of file #' + id + ' COMPLETED', 'success');
            ui_multi_update_file_status(id, 'success', 'Upload Complete');
            ui_multi_update_file_progress(id, 100, 'success', false);

            obj = JSON.stringify(data);

            $.ajax({
                type: 'post',
                url: 'prosesexcel.php',
                async: true,
                data: {
                    filevar: obj
                },
                beforeSend: function () {
                    //$('#import-out').html("&nbsp;&nbsp;&nbsp;<img src='wsprocessing.gif' width='30%'>");
                    $('#import-out').html("");
                    //alert("Proses import data..");
                    $('#logupload', window.parent.document).text("Proses upload file excel... import data...");
                },
                success: function (data) {
                    //$('#import-out').html(data);
                    $('#import-out').html("");
                    //alert("Proses import data finish..");
                    $('#logupload', window.parent.document).text("Proses upload file excel... import data... selesai...");
                },                
                error: function (xhr, textStatus, error) {
                    console.log("error : ");
                    console.log("xhr.statusText : " + xhr.statusText);
                    console.log("textStatus : " + textStatus);
                    console.log("message : " + error);
                    $('#import-out').html(xhr.statusText + " " + error);
                },
                timeout: 3600000
            });
        },
        onUploadError: function (id, xhr, status, message) {

            //alert("onUploadError...");
            $('#logupload', window.parent.document).text("onUploadError : " + xhr.statusText + ", " + status + ", " + message);

            ui_multi_update_file_status(id, 'danger', message);
            ui_multi_update_file_progress(id, 0, 'danger', false);
        },
        onFallbackMode: function () {
            // When the browser doesn't support this plugin :(
            ui_add_log('Plugin cant be used here, running Fallback callback', 'danger');
        },
        onFileSizeError: function (file) {
            ui_add_log('File \'' + file.name + '\' cannot be added: size excess limit', 'danger');
        }
    });



});

