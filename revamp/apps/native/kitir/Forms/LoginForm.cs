using System.Drawing;
using System.Windows.Forms;

using SwatKitirPrinter.Api;

namespace SwatKitirPrinter.Forms;

/// <summary>Native bearer-token login (POST /auth/token) gating the printer.</summary>
public sealed class LoginForm : Form
{
    private readonly SwatApiClient _api;
    private readonly TextBox _username = new() { Width = 200 };
    private readonly TextBox _password = new() { Width = 200, UseSystemPasswordChar = true };
    private readonly Button _loginButton = new() { Text = "Masuk", Width = 200, Height = 30 };
    private readonly Label _error = new() { ForeColor = Color.Firebrick, AutoSize = false, Width = 260, Height = 40 };

    public LoginForm(SwatApiClient api)
    {
        _api = api;
        BuildLayout();
        _loginButton.Click += async (_, _) => await TryLoginAsync();
        AcceptButton = _loginButton;
    }

    private void BuildLayout()
    {
        Text = "SWAT — Masuk";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterScreen;
        MaximizeBox = false;
        MinimizeBox = false;
        ClientSize = new Size(300, 230);

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(20),
            ColumnCount = 1,
            RowCount = 6,
        };
        layout.Controls.Add(new Label { Text = "Pengguna", AutoSize = true });
        layout.Controls.Add(_username);
        layout.Controls.Add(new Label { Text = "Kata sandi", AutoSize = true });
        layout.Controls.Add(_password);
        layout.Controls.Add(_loginButton);
        layout.Controls.Add(_error);
        Controls.Add(layout);
    }

    private async Task TryLoginAsync()
    {
        if (string.IsNullOrWhiteSpace(_username.Text) || string.IsNullOrEmpty(_password.Text))
        {
            _error.Text = "Isi nama pengguna dan kata sandi.";
            return;
        }

        SetBusy(true);
        try
        {
            await _api.LoginAsync(_username.Text.Trim(), _password.Text);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (ApiException ex)
        {
            _error.Text = ex.Code == "mustChangePassword"
                ? "Kata sandi harus diganti dulu lewat aplikasi web sebelum bisa mencetak."
                : ex.Message;
        }
        catch (Exception)
        {
            _error.Text = "Tidak dapat terhubung ke server. Periksa koneksi dan ApiBaseUrl.";
        }
        finally
        {
            SetBusy(false);
        }
    }

    private void SetBusy(bool busy)
    {
        _loginButton.Enabled = !busy;
        _loginButton.Text = busy ? "Memproses…" : "Masuk";
        UseWaitCursor = busy;
    }
}
