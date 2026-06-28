using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;

namespace SwatKitirPrinter.Api;

/// <summary>
/// Thin client over the SWAT REST API for the kitir printer. Authenticates with
/// the native bearer-token flow (POST /auth/token), attaches the access token to
/// every call, and transparently refreshes once on a 401.
/// </summary>
public sealed class SwatApiClient : IDisposable
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _http;
    private string? _accessToken;
    private string? _refreshToken;

    public SwatApiClient(string baseUrl)
    {
        // BaseAddress needs a trailing slash so relative paths resolve correctly.
        var root = baseUrl.EndsWith('/') ? baseUrl : baseUrl + "/";
        _http = new HttpClient { BaseAddress = new Uri(root), Timeout = TimeSpan.FromSeconds(30) };
    }

    public bool IsAuthenticated => !string.IsNullOrEmpty(_accessToken);

    /// <summary>Logs in and stores the token pair. Throws <see cref="ApiException"/> on failure.</summary>
    public async Task LoginAsync(string username, string password)
    {
        using var res = await _http.PostAsJsonAsync(
            "auth/token", new { username, password }, Json);
        var token = await UnwrapAsync<TokenPair>(res);
        _accessToken = token.AccessToken;
        _refreshToken = token.RefreshToken;
    }

    public Task<List<Vehicle>> GetVehiclesAsync() => GetAllPagedAsync<Vehicle>("vehicles");

    public Task<List<Site>> GetSitesAsync() => GetAllPagedAsync<Site>("sites");

    /// <summary>Issues N kitir and returns them with their printable codes.</summary>
    public async Task<List<DisposalPermit>> BulkIssueAsync(BulkIssueRequest request)
    {
        using var res = await SendAsync(() =>
            new HttpRequestMessage(HttpMethod.Post, "disposal-permits/bulk-issue")
            {
                Content = JsonContent.Create(request, options: Json),
            });
        return await UnwrapAsync<List<DisposalPermit>>(res);
    }

    /// <summary>Fetches every page of a paginated list endpoint (limit caps at 1000).</summary>
    private async Task<List<T>> GetAllPagedAsync<T>(string path)
    {
        const int limit = 1000;
        var all = new List<T>();
        for (var page = 1; ; page += 1)
        {
            using var res = await SendAsync(() =>
                new HttpRequestMessage(HttpMethod.Get, $"{path}?page={page}&limit={limit}"));
            var envelope = await ReadEnvelopeAsync<List<T>>(res);
            // Surface a 401/403/5xx instead of silently returning an empty list
            // (e.g. a missing vehicle:read/site:read permission must reach the user).
            ThrowIfFailed(res, envelope);
            var count = envelope.Data?.Count ?? 0;
            if (count > 0)
            {
                all.AddRange(envelope.Data!);
            }
            // A short (or empty) page means we've reached the end — robust even if
            // the server ever omits Meta.Total. The 1000-page guard backstops a
            // server that always returns a full page.
            if (count < limit || page >= 1000)
            {
                break;
            }
        }
        return all;
    }

    /// <summary>
    /// Sends a request with the bearer token. On a single 401 it refreshes the
    /// token and retries once. The factory rebuilds the request because an
    /// <see cref="HttpRequestMessage"/> cannot be sent twice.
    /// </summary>
    private async Task<HttpResponseMessage> SendAsync(Func<HttpRequestMessage> factory)
    {
        var res = await SendOnceAsync(factory());
        if (res.StatusCode == HttpStatusCode.Unauthorized && await TryRefreshAsync())
        {
            res.Dispose();
            res = await SendOnceAsync(factory());
        }
        return res;
    }

    private Task<HttpResponseMessage> SendOnceAsync(HttpRequestMessage request)
    {
        if (!string.IsNullOrEmpty(_accessToken))
        {
            request.Headers.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _accessToken);
        }
        return _http.SendAsync(request);
    }

    private async Task<bool> TryRefreshAsync()
    {
        if (string.IsNullOrEmpty(_refreshToken))
        {
            return false;
        }
        try
        {
            using var res = await _http.PostAsJsonAsync(
                "auth/token/refresh", new { refreshToken = _refreshToken }, Json);
            var token = await UnwrapAsync<TokenPair>(res);
            _accessToken = token.AccessToken;
            _refreshToken = token.RefreshToken;
            return true;
        }
        catch (ApiException)
        {
            _accessToken = null;
            _refreshToken = null;
            return false;
        }
    }

    /// <summary>Reads the envelope and throws a localized <see cref="ApiException"/> on failure.</summary>
    private static async Task<T> UnwrapAsync<T>(HttpResponseMessage res)
    {
        var envelope = await ReadEnvelopeAsync<T>(res);
        ThrowIfFailed(res, envelope);
        if (envelope.Data is null)
        {
            throw new ApiException("ERROR", FallbackMessage(res.StatusCode));
        }
        return envelope.Data;
    }

    /// <summary>Throws a localized <see cref="ApiException"/> when the response is not a success.</summary>
    private static void ThrowIfFailed<T>(HttpResponseMessage res, ApiEnvelope<T> envelope)
    {
        if (!res.IsSuccessStatusCode || envelope.Success == false)
        {
            var err = envelope.Error;
            throw new ApiException(err?.Code ?? "ERROR", err?.Message ?? FallbackMessage(res.StatusCode));
        }
    }

    private static async Task<ApiEnvelope<T>> ReadEnvelopeAsync<T>(HttpResponseMessage res)
    {
        try
        {
            var envelope = await res.Content.ReadFromJsonAsync<ApiEnvelope<T>>(Json);
            return envelope ?? new ApiEnvelope<T>();
        }
        catch (Exception ex) when (ex is JsonException or NotSupportedException or HttpRequestException)
        {
            // Non-JSON body (gateway error page, network failure): surface a safe message.
            throw new ApiException("NETWORK", FallbackMessage(res.StatusCode));
        }
    }

    private static string FallbackMessage(HttpStatusCode status) => status switch
    {
        HttpStatusCode.Unauthorized => "Sesi tidak valid atau telah berakhir. Masuk kembali.",
        HttpStatusCode.Forbidden => "Anda tidak memiliki izin untuk operasi ini.",
        HttpStatusCode.NotFound => "Layanan tidak ditemukan. Periksa ApiBaseUrl.",
        _ => "Tidak dapat terhubung ke server SWAT. Periksa koneksi dan konfigurasi.",
    };

    public void Dispose() => _http.Dispose();
}
