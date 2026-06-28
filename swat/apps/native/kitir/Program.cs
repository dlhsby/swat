using System.Windows.Forms;

using SwatKitirPrinter.Api;
using SwatKitirPrinter.Forms;

namespace SwatKitirPrinter;

internal static class Program
{
    /// <summary>Entry point: load config, authenticate, then open the issue-and-print form.</summary>
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        AppConfig config;
        try
        {
            config = AppConfig.Load();
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "Konfigurasi", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        using var api = new SwatApiClient(config.ApiBaseUrl);

        using var login = new LoginForm(api);
        if (login.ShowDialog() != DialogResult.OK)
        {
            return;
        }

        Application.Run(new MainForm(api, config));
    }
}
