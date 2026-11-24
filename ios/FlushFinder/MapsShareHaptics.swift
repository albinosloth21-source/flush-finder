import MapKit
import UIKit

enum MapsShareHaptics {
    static func haptic(_ kind: String) {
        switch kind {
        case "success":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning":
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "medium":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        default:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    static func openDirections(lat: Double, lng: Double, name: String, app: String) {
        let coord = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        switch app {
        case "google":
            openFirst([
                "comgooglemaps://?daddr=\(lat),\(lng)&directionsmode=walking",
                "https://www.google.com/maps/dir/?api=1&destination=\(lat),\(lng)",
            ])
        case "waze":
            openFirst([
                "waze://?ll=\(lat),\(lng)&navigate=yes",
                "https://waze.com/ul?ll=\(lat),\(lng)&navigate=yes",
            ])
        default:
            let item = MKMapItem(placemark: MKPlacemark(coordinate: coord))
            item.name = name.isEmpty ? "Restroom" : name
            item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking])
        }
    }

    static func share(from presenter: UIViewController, title: String, text: String, url: String, done: @escaping () -> Void) {
        var items: [Any] = [text]
        if let link = URL(string: url) { items.append(link) }
        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        sheet.completionWithItemsHandler = { _, _, _, _ in done() }
        if let pop = sheet.popoverPresentationController {
            pop.sourceView = presenter.view
            pop.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
        }
        presenter.present(sheet, animated: true)
    }

    private static func openFirst(_ candidates: [String]) {
        for raw in candidates {
            guard let url = URL(string: raw) else { continue }
            if url.scheme == "https" || url.scheme == "http" || UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
                return
            }
        }
    }
}
