using System.Drawing;
using System.Windows.Forms;

using SwatKitirPrinter.Api;
using SwatKitirPrinter.Printing;

namespace SwatKitirPrinter.Forms;

/// <summary>
/// Issue-and-print workflow: pick vehicle/site/dates/count, issue N kitir via the
/// API, then print the returned codes to the SATO printer (or dry-run to a file).
/// Replaces the legacy two-textbox manual-entry form.
/// </summary>
public sealed class MainForm : Form
{
    private readonly SwatApiClient _api;
    private readonly KitirPrintService _printer;

    private readonly ComboBox _vehicle = new() { Width = 220, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly ComboBox _site = new() { Width = 220, DropDownStyle = ComboBoxStyle.DropDownList };
    private readonly DateTimePicker _validFrom = new() { Format = DateTimePickerFormat.Short, Width = 220 };
    private readonly DateTimePicker _validTo = new() { Format = DateTimePickerFormat.Short, Width = 220 };
    private readonly DateTimePicker _issuedAt = new() { Format = DateTimePickerFormat.Short, Width = 220, ShowCheckBox = true, Checked = false };
    private readonly NumericUpDown _count = new() { Minimum = 1, Maximum = 200, Value = 1, Width = 220 };
    private readonly CheckBox _dryRun = new() { Text = "Uji cetak (tulis ke file .prn, tanpa printer)", AutoSize = true };
    private readonly Button _issueButton = new() { Text = "Terbitkan && Cetak", Width = 160, Height = 32 };
    private readonly Button _reprintButton = new() { Text = "Cetak ulang", Width = 110, Height = 32, Enabled = false };
    private readonly DataGridView _grid = new() { Dock = DockStyle.Fill, ReadOnly = true, AllowUserToAddRows = false, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill };
    private readonly Label _status = new() { Dock = DockStyle.Fill, AutoSize = true, TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(12, 4, 12, 4) };

    private List<string> _lastBatch = new();

    public MainForm(SwatApiClient api, AppConfig config)
    {
        _api = api;
        _printer = new KitirPrintService(config);
        BuildLayout();
        _issueButton.Click += async (_, _) => await IssueAndPrintAsync();
        _reprintButton.Click += (_, _) => PrintBatch(_lastBatch, reprint: true);
        Load += async (_, _) => await LoadPickersAsync();
    }

    private void BuildLayout()
    {
        Text = "SWAT — Pencetak Kitir";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(640, 480);
        MinimumSize = new Size(560, 420);

        var form = new TableLayoutPanel { Dock = DockStyle.Fill, AutoSize = true, ColumnCount = 2, Padding = new Padding(12) };
        form.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110));
        form.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        AddRow(form, "Kendaraan", _vehicle);
        AddRow(form, "Lokasi (TPA)", _site);
        AddRow(form, "Berlaku dari", _validFrom);
        AddRow(form, "Berlaku sampai", _validTo);
        AddRow(form, "Tanggal terbit", _issuedAt);
        AddRow(form, "Jumlah", _count);
        AddRow(form, "", _dryRun);

        var buttons = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoSize = true, Padding = new Padding(12, 0, 12, 8) };
        buttons.Controls.Add(_issueButton);
        buttons.Controls.Add(_reprintButton);

        // Deterministic top-to-bottom layout: inputs, buttons, results grid (fills), status.
        var root = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 4 };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.Controls.Add(form, 0, 0);
        root.Controls.Add(buttons, 0, 1);
        root.Controls.Add(_grid, 0, 2);
        root.Controls.Add(_status, 0, 3);
        Controls.Add(root);
        ConfigureGrid();
    }

    private static void AddRow(TableLayoutPanel panel, string label, Control control)
    {
        panel.Controls.Add(new Label { Text = label, AutoSize = true, Anchor = AnchorStyles.Left, Margin = new Padding(0, 6, 8, 6) });
        panel.Controls.Add(control);
    }

    private void ConfigureGrid()
    {
        _grid.AutoGenerateColumns = false;
        _grid.Columns.Add(new DataGridViewTextBoxColumn { HeaderText = "Kode Kitir", DataPropertyName = nameof(DisposalPermit.Code) });
        _grid.Columns.Add(new DataGridViewTextBoxColumn { HeaderText = "Kendaraan", DataPropertyName = nameof(DisposalPermit.VehiclePlate) });
        _grid.Columns.Add(new DataGridViewTextBoxColumn { HeaderText = "Lokasi", DataPropertyName = nameof(DisposalPermit.SiteName) });
        _grid.Columns.Add(new DataGridViewTextBoxColumn { HeaderText = "Dari", DataPropertyName = nameof(DisposalPermit.ValidFrom) });
        _grid.Columns.Add(new DataGridViewTextBoxColumn { HeaderText = "Sampai", DataPropertyName = nameof(DisposalPermit.ValidTo) });
    }

    private async Task LoadPickersAsync()
    {
        SetBusy(true, "Memuat data kendaraan dan lokasi…");
        try
        {
            var vehicles = await _api.GetVehiclesAsync();
            var sites = await _api.GetSitesAsync();
            if (vehicles.Count == 0 || sites.Count == 0)
            {
                ShowError("Tidak ada kendaraan atau lokasi yang tersedia. Hubungi administrator.");
                return;
            }
            _vehicle.DisplayMember = nameof(Vehicle.PlateNumber);
            _vehicle.ValueMember = nameof(Vehicle.Id);
            _vehicle.DataSource = vehicles;
            _site.DisplayMember = nameof(Site.Name);
            _site.ValueMember = nameof(Site.Id);
            _site.DataSource = sites;
            _status.Text = $"{vehicles.Count} kendaraan, {sites.Count} lokasi dimuat.";
        }
        catch (ApiException ex)
        {
            ShowError(ex.Message);
        }
        finally
        {
            SetBusy(false);
        }
    }

    private async Task IssueAndPrintAsync()
    {
        if (_vehicle.SelectedValue is not string vehicleId || _site.SelectedValue is not string siteId)
        {
            ShowError("Pilih kendaraan dan lokasi terlebih dahulu.");
            return;
        }
        if (_validTo.Value.Date < _validFrom.Value.Date)
        {
            ShowError("Berlaku sampai tidak boleh sebelum berlaku dari.");
            return;
        }

        var request = new BulkIssueRequest
        {
            VehicleId = vehicleId,
            SiteId = siteId,
            IssuedAt = _issuedAt.Checked ? _issuedAt.Value.ToString("yyyy-MM-dd") : null,
            ValidFrom = _validFrom.Value.ToString("yyyy-MM-dd"),
            ValidTo = _validTo.Value.ToString("yyyy-MM-dd"),
            Count = (int)_count.Value,
        };

        SetBusy(true, "Menerbitkan kitir…");
        try
        {
            var permits = await _api.BulkIssueAsync(request);
            _grid.DataSource = permits;
            _lastBatch = permits.Where(p => !string.IsNullOrEmpty(p.Code)).Select(p => p.Code!).ToList();
            _reprintButton.Enabled = _lastBatch.Count > 0;
            PrintBatch(_lastBatch, reprint: false);
        }
        catch (ApiException ex)
        {
            ShowError(ex.Message);
        }
        finally
        {
            SetBusy(false);
        }
    }

    private void PrintBatch(IReadOnlyList<string> codes, bool reprint)
    {
        if (codes.Count == 0)
        {
            ShowError("Tidak ada kode untuk dicetak.");
            return;
        }
        try
        {
            if (_dryRun.Checked)
            {
                var path = _printer.DryRunToFile(codes);
                _status.Text = $"Uji cetak: {codes.Count} kitir ditulis ke {path}";
                return;
            }
            _printer.Print(codes);
            var verb = reprint ? "dicetak ulang" : "diterbitkan & dicetak";
            _status.Text = $"{codes.Count} kitir {verb} ke printer.";
        }
        catch (Exception ex)
        {
            ShowError(ex.Message);
        }
    }

    private void ShowError(string message)
    {
        _status.Text = message;
        MessageBox.Show(message, "SWAT", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }

    private void SetBusy(bool busy, string? message = null)
    {
        _issueButton.Enabled = !busy;
        UseWaitCursor = busy;
        if (message is not null)
        {
            _status.Text = message;
        }
    }
}
