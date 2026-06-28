using System.Text.Json.Serialization;

namespace SwatKitirPrinter.Api;

/// <summary>Canonical SWAT API envelope: <c>{ success, data, error, meta }</c>.</summary>
public sealed record ApiEnvelope<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public ApiError? Error { get; init; }
    public PaginationMeta? Meta { get; init; }
}

public sealed record ApiError
{
    public string Code { get; init; } = "";
    public string Message { get; init; } = "";
    public Dictionary<string, string[]>? Details { get; init; }
}

public sealed record PaginationMeta
{
    public int Total { get; init; }
    public int Page { get; init; }
    public int Limit { get; init; }
}

/// <summary>Response of <c>POST /auth/token</c> (and <c>/refresh</c>).</summary>
public sealed record TokenPair
{
    public string AccessToken { get; init; } = "";
    public string RefreshToken { get; init; } = "";
    public string TokenType { get; init; } = "Bearer";
    public int ExpiresIn { get; init; }
}

/// <summary>A vehicle option for the picker (<c>GET /vehicles</c>).</summary>
public sealed record Vehicle
{
    public string Id { get; init; } = "";
    public string PlateNumber { get; init; } = "";
    public string Status { get; init; } = "";
}

/// <summary>A site option for the picker (<c>GET /sites</c>).</summary>
public sealed record Site
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
}

/// <summary>Request body for <c>POST /disposal-permits/bulk-issue</c>.</summary>
public sealed record BulkIssueRequest
{
    public string VehicleId { get; init; } = "";
    public string SiteId { get; init; } = "";

    /// <summary>YYYY-MM-DD; omitted (null) means "today" on the server.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? IssuedAt { get; init; }

    public string ValidFrom { get; init; } = "";
    public string ValidTo { get; init; } = "";
    public int Count { get; init; }
}

/// <summary>A single issued kitir (the printable record returned by bulk-issue).</summary>
public sealed record DisposalPermit
{
    public string Id { get; init; } = "";
    public string? Code { get; init; }
    public string VehiclePlate { get; init; } = "";
    public string SiteName { get; init; } = "";
    public string Status { get; init; } = "";
    public string IssuedAt { get; init; } = "";
    public string ValidFrom { get; init; } = "";
    public string ValidTo { get; init; } = "";
}
