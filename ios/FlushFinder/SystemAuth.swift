import AuthenticationServices
import UIKit

/// Google and X sign-in. Uses the system browser, then returns the session token
/// from the flushfinder:// redirect. The page WebView never sees the OAuth host.
final class SystemAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    weak var presenter: UIViewController?
    private var session: ASWebAuthenticationSession?

    func start(url: URL, done: @escaping (Result<String, Error>) -> Void) {
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "flushfinder") { callback, error in
            if let error {
                let ns = error as NSError
                if ns.domain == ASWebAuthenticationSessionErrorDomain,
                   ns.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                    done(.failure(AuthFailure("Sign-in was cancelled")))
                } else {
                    done(.failure(error))
                }
                return
            }
            guard let callback else {
                done(.failure(AuthFailure("Sign-in didn't finish")))
                return
            }
            let parts = URLComponents(url: callback, resolvingAgainstBaseURL: false)
            if let error = parts?.queryItems?.first(where: { $0.name == "error" })?.value, !error.isEmpty {
                done(.failure(AuthFailure("Sign-in didn't finish")))
                return
            }
            if let token = parts?.queryItems?.first(where: { $0.name == "token" })?.value, !token.isEmpty {
                done(.success(token))
                return
            }
            done(.failure(AuthFailure("Sign-in didn't return a session")))
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        self.session = session
        if !session.start() {
            done(.failure(AuthFailure("Couldn't open the sign-in window")))
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        presenter?.view.window ?? ASPresentationAnchor()
    }
}

struct AuthFailure: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
