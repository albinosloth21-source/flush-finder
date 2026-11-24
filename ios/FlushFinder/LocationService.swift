import CoreLocation

final class LocationService: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var pending: ((Result<(lat: Double, lng: Double), Error>) -> Void)?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func request(_ done: @escaping (Result<(lat: Double, lng: Double), Error>) -> Void) {
        pending = done
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            finish(.failure(LocationFailure("Location is off for Flush Finder. Turn it on in Settings, or browse the map without it.")))
        default:
            manager.requestLocation()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard pending != nil else { return }
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            manager.requestLocation()
        case .denied, .restricted:
            finish(.failure(LocationFailure("Location is off for Flush Finder. Turn it on in Settings, or browse the map without it.")))
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let fix = locations.last else { return }
        finish(.success((lat: fix.coordinate.latitude, lng: fix.coordinate.longitude)))
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        finish(.failure(LocationFailure("Your location isn't available right now.")))
    }

    private func finish(_ result: Result<(lat: Double, lng: Double), Error>) {
        let callback = pending
        pending = nil
        DispatchQueue.main.async { callback?(result) }
    }
}

private struct LocationFailure: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
