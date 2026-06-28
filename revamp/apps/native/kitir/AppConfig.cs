using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SwatKitirPrinter;

/// <summary>
/// Position of a single kitir on the (optionally two-up) label, in printer dots.
/// Mirrors the legacy SBPL template: a PDF417 barcode plus a human-readable caption.
/// </summary>
public sealed record LabelSlot
{
    public int BarcodeH { get; init; }
    public int BarcodeV { get; init; }
    public int TextH { get; init; }
    public int TextV { get; init; }
}

/// <summary>Label-layout knobs ported from the legacy <c>Form1.cs</c> SBPL template.</summary>
public sealed record LabelConfig
{
    /// <summary>Print two kitir per physical label (legacy label stock is two-up).</summary>
    public bool TwoUp { get; init; } = true;

    /// <summary>
    /// Optional payload prefix for the PDF417 data. The legacy app prepended "0000000".
    /// Empty by default: the new scanner (POST /weighbridge/resolve-kitir) matches the
    /// kitir <c>code</c> exactly, so the barcode must encode the raw code.
    /// </summary>
    public string EncodePrefix { get; init; } = "";

    public LabelSlot Slot1 { get; init; } = new() { BarcodeH = 180, BarcodeV = 10, TextH = 240, TextV = 90 };
    public LabelSlot Slot2 { get; init; } = new() { BarcodeH = 470, BarcodeV = 10, TextH = 530, TextV = 90 };

    /// <summary>SBPL PDF417 command parameters that follow <c>&lt;ESC&gt;BK</c> (legacy: 02044).</summary>
    public string Pdf417Params { get; init; } = "02044";
}

/// <summary>Application configuration loaded from <c>appsettings.json</c> beside the exe.</summary>
public sealed record AppConfig
{
    public string ApiBaseUrl { get; init; } = "";
    public string PrinterName { get; init; } = "SATO CG408";
    public LabelConfig Label { get; init; } = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// Loads and validates config. Fails loudly (throws) when required values are
    /// missing rather than falling back to a hardcoded backend URL.
    /// </summary>
    public static AppConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"File konfigurasi tidak ditemukan: {path}. Salin appsettings.json ke folder aplikasi.");
        }

        AppConfig? config;
        try
        {
            config = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(path), JsonOptions);
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException($"Konfigurasi tidak valid (appsettings.json): {ex.Message}", ex);
        }

        if (config is null || string.IsNullOrWhiteSpace(config.ApiBaseUrl))
        {
            throw new InvalidOperationException("Konfigurasi 'ApiBaseUrl' wajib diisi di appsettings.json.");
        }
        if (string.IsNullOrWhiteSpace(config.PrinterName))
        {
            throw new InvalidOperationException("Konfigurasi 'PrinterName' wajib diisi di appsettings.json.");
        }
        return config;
    }
}
