import Foundation

struct ProductionConfig: Decodable {
    let productionUrl: String
    let host: String
    let packageId: String
    let appName: String

    var pageURL: URL? {
        URL(string: productionUrl)
    }

    /// Same rule as the Android release build: don't ship the placeholder host.
    var isPlaceholder: Bool {
        host.hasPrefix("REPLACE") || host.hasSuffix(".example") || !productionUrl.hasPrefix("https://")
    }

    static func load() -> ProductionConfig? {
        guard let url = Bundle.main.url(forResource: "production-url", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(ProductionConfig.self, from: data)
    }
}
