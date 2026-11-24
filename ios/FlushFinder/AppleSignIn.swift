import AuthenticationServices
import CryptoKit
import UIKit

/// Native Sign in with Apple sheet. Posts the identity token to Better Auth and
/// returns the session bearer. Required because the app also offers Google and X.
final class AppleSignIn: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    weak var presenter: UIViewController?
    private var rawNonce: String?
    private var apiBase: URL?
    private var done: ((Result<String, Error>) -> Void)?

    func start(apiBase: URL, done: @escaping (Result<String, Error>) -> Void) {
        self.apiBase = apiBase
        self.done = done
        let nonce = Self.randomNonce()
        rawNonce = nonce
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              let rawNonce,
              let apiBase else {
            finish(.failure(AuthFailure("Sign in with Apple didn't return an identity.")))
            return
        }
        exchange(identityToken: identityToken, nonce: rawNonce, credential: credential, apiBase: apiBase)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let ns = error as NSError
        if ns.domain == ASAuthorizationError.errorDomain, ns.code == ASAuthorizationError.canceled.rawValue {
            finish(.failure(AuthFailure("Sign-in was cancelled")))
        } else {
            finish(.failure(error))
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        presenter?.view.window ?? ASPresentationAnchor()
    }

    private func exchange(identityToken: String, nonce: String, credential: ASAuthorizationAppleIDCredential, apiBase: URL) {
        var user: [String: Any] = [:]
        if let email = credential.email { user["email"] = email }
        let given = credential.fullName?.givenName
        let family = credential.fullName?.familyName
        if given != nil || family != nil {
            var name: [String: String] = [:]
            if let given { name["firstName"] = given }
            if let family { name["lastName"] = family }
            user["name"] = name
        }
        var idToken: [String: Any] = ["token": identityToken, "nonce": nonce]
        if !user.isEmpty { idToken["user"] = user }
        let body: [String: Any] = [
            "provider": "apple",
            "callbackURL": "/",
            "idToken": idToken,
        ]
        guard let payload = try? JSONSerialization.data(withJSONObject: body),
              let endpoint = URL(string: "/api/auth/sign-in/social", relativeTo: apiBase)?.absoluteURL else {
            finish(.failure(AuthFailure("Couldn't reach Flush Finder to finish Apple sign-in.")))
            return
        }
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = payload
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error {
                self?.finish(.failure(error))
                return
            }
            let http = response as? HTTPURLResponse
            if let header = http?.value(forHTTPHeaderField: "set-auth-token"), !header.isEmpty {
                self?.finish(.success(header))
                return
            }
            if let data,
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let token = json["token"] as? String, !token.isEmpty {
                self?.finish(.success(token))
                return
            }
            let status = http?.statusCode ?? 0
            self?.finish(.failure(AuthFailure("Sign in with Apple failed (\(status)). The server needs Apple sign-in configured for this bundle ID.")))
        }.resume()
    }

    private func finish(_ result: Result<String, Error>) {
        let callback = done
        done = nil
        DispatchQueue.main.async { callback?(result) }
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var output = ""
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        for byte in bytes {
            output.append(charset[Int(byte) % charset.count])
        }
        return output
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
