import SwiftUI
import WebKit

struct WebShellView: UIViewControllerRepresentable {
    let startURL: URL
    let allowedHost: String

    func makeUIViewController(context: Context) -> WebShellController {
        WebShellController(startURL: startURL, allowedHost: allowedHost)
    }

    func updateUIViewController(_ controller: WebShellController, context: Context) {}
}

final class WebShellController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private let startURL: URL
    private let allowedHost: String
    private var webView: WKWebView!
    private let bridge = BridgeBox()
    private let location = LocationService()
    private let auth = SystemAuth()
    private let apple = AppleSignIn()

    init(startURL: URL, allowedHost: String) {
        self.startURL = startURL
        self.allowedHost = allowedHost
        super.init(nibName: nil, bundle: nil)
        bridge.owner = self
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.118, green: 0.310, blue: 0.290, alpha: 1)

        let content = WKUserContentController()
        let flag = WKUserScript(
            source: "window.flushFinderIOS = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        content.addUserScript(flag)
        content.add(bridge, name: "flushFinder")

        let config = WKWebViewConfiguration()
        config.userContentController = content
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.websiteDataStore = .default()

        let web = WKWebView(frame: view.bounds, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        view.addSubview(web)
        webView = web
        auth.presenter = self
        apple.presenter = self
        web.load(URLRequest(url: startURL))
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let id = body["id"] as? String, let action = body["action"] as? String else {
            return
        }
        switch action {
        case "location":
            location.request { [weak self] result in
                switch result {
                case let .success(fix):
                    self?.resolve(id, ["lat": fix.lat, "lng": fix.lng])
                case let .failure(error):
                    self?.reject(id, error.localizedDescription)
                }
            }
        case "directions":
            let lat = double(body["lat"])
            let lng = double(body["lng"])
            let name = body["name"] as? String ?? ""
            let app = body["app"] as? String ?? "apple"
            MapsShareHaptics.openDirections(lat: lat, lng: lng, name: name, app: app)
            resolve(id, [:])
        case "share":
            let title = body["title"] as? String ?? "Flush Finder"
            let text = body["text"] as? String ?? title
            let url = body["url"] as? String ?? ""
            MapsShareHaptics.share(from: self, title: title, text: text, url: url) { [weak self] in
                self?.resolve(id, [:])
            }
        case "haptic":
            MapsShareHaptics.haptic(body["kind"] as? String ?? "light")
            resolve(id, [:])
        case "auth":
            guard let raw = body["url"] as? String, let url = URL(string: raw) else {
                reject(id, "Sign-in didn't return a URL")
                return
            }
            auth.start(url: url) { [weak self] result in
                switch result {
                case let .success(token):
                    self?.resolve(id, ["token": token])
                case let .failure(error):
                    self?.reject(id, error.localizedDescription)
                }
            }
        case "apple":
            apple.start(apiBase: startURL) { [weak self] result in
                switch result {
                case let .success(token):
                    self?.resolve(id, ["token": token])
                case let .failure(error):
                    self?.reject(id, error.localizedDescription)
                }
            }
        default:
            reject(id, "Unknown action")
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        if url.scheme == "flushfinder" {
            decisionHandler(.cancel)
            return
        }
        // Don't let Google / X / Apple OAuth run inside this WebView.
        if navigationAction.targetFrame?.isMainFrame != false, isOAuthHost(url) {
            decisionHandler(.cancel)
            return
        }
        if navigationAction.navigationType == .linkActivated, let host = url.host, !hostMatches(host) {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }

    private func hostMatches(_ host: String) -> Bool {
        let got = host.lowercased()
        let want = allowedHost.lowercased()
        return got == want || got == "www.\(want)"
    }

    private func isOAuthHost(_ url: URL) -> Bool {
        let host = (url.host ?? "").lowercased()
        return host == "accounts.google.com"
            || host == "appleid.apple.com"
            || host == "api.twitter.com"
            || host == "twitter.com"
            || host == "x.com"
    }

    private func resolve(_ id: String, _ value: [String: Any]) {
        reply(id: id, ok: true, value: value, message: nil)
    }

    private func reject(_ id: String, _ message: String) {
        reply(id: id, ok: false, value: [:], message: message)
    }

    private func reply(id: String, ok: Bool, value: [String: Any], message: String?) {
        let idLiteral = jsonString(id)
        let js: String
        if ok {
            let payload = (try? String(data: JSONSerialization.data(withJSONObject: value), encoding: .utf8)) ?? "{}"
            js = "window.__flushFinderResolve && window.__flushFinderResolve(\(idLiteral), \(payload))"
        } else {
            js = "window.__flushFinderReject && window.__flushFinderReject(\(idLiteral), \(jsonString(message ?? "Failed")))"
        }
        DispatchQueue.main.async { [weak self] in
            self?.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func jsonString(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [value])
        let wrapped = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return String(wrapped.dropFirst().dropLast())
    }

    private func double(_ value: Any?) -> Double {
        if let number = value as? Double { return number }
        if let number = value as? NSNumber { return number.doubleValue }
        if let text = value as? String { return Double(text) ?? 0 }
        return 0
    }
}

/// Breaks the retain cycle between WKUserContentController and the controller.
private final class BridgeBox: NSObject, WKScriptMessageHandler {
    weak var owner: WebShellController?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.userContentController(userContentController, didReceive: message)
    }
}
