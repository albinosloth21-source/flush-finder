import SwiftUI

@main
struct FlushFinderApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

struct RootView: View {
    private let config = ProductionConfig.load()

    var body: some View {
        Group {
            if let config, let page = config.pageURL, !config.isPlaceholder {
                WebShellView(startURL: page, allowedHost: config.host)
            } else {
                PlaceholderView()
            }
        }
        .preferredColorScheme(.dark)
    }
}

/// Shown until native/production-url.json points at the live site.
private struct PlaceholderView: View {
    var body: some View {
        ZStack {
            Color(red: 0.118, green: 0.310, blue: 0.290).ignoresSafeArea()
            VStack(alignment: .leading, spacing: 16) {
                Text("Flush Finder")
                    .font(.largeTitle.weight(.semibold))
                    .foregroundStyle(Color(red: 0.788, green: 0.635, blue: 0.153))
                Text("This build is still pointed at the placeholder site.")
                    .foregroundStyle(.white)
                Text("On the Mac that archives the app, set productionUrl and host in native/production-url.json to the live https origin, then build again. That file is the only URL.")
                    .font(.callout)
                    .foregroundStyle(.white.opacity(0.85))
            }
            .padding(28)
        }
    }
}
