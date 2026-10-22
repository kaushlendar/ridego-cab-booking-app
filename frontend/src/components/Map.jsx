"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import L from "leaflet";
import "leaflet-routing-machine";

const markerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });

  return null;
}

function Routing({
  pickupLocation,
  destinationLocation,
  onRouteFound,
}) {
  const map = require("react-leaflet").useMap();

  if (pickupLocation && destinationLocation) {
    const pickup = L.latLng(
      pickupLocation.lat,
      pickupLocation.lng
    );

    const destination = L.latLng(
      destinationLocation.lat,
      destinationLocation.lng
    );

    if (!map._routingControl) {
      map._routingControl = L.Routing.control({
        waypoints: [pickup, destination],

        routeWhileDragging: false,

        addWaypoints: false,

        draggableWaypoints: false,

        show: false,

        createMarker: () => null,

        lineOptions: {
          styles: [
            {
              weight: 6,
            },
          ],
        },
      }).addTo(map);

      map._routingControl.on("routesfound", (event) => {
        const route = event.routes[0];

        if (route && route.summary) {
          const distanceInKm =
            route.summary.totalDistance / 1000;

          onRouteFound(distanceInKm);
        }
      });
    } else {
      map._routingControl.setWaypoints([
        pickup,
        destination,
      ]);
    }
  }

  return null;
}

export default function Map({
  pickupLocation,
  destinationLocation,
  onLocationSelect,
  onRouteFound,
}) {

  const defaultPosition = [25.5941, 85.1376];

  return (
    <div className="h-[450px] w-full overflow-hidden rounded-2xl shadow-lg">
      <MapContainer
        center={defaultPosition}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          onLocationSelect={onLocationSelect}
        />

        <Routing
        pickupLocation={pickupLocation}
        destinationLocation={destinationLocation}
        onRouteFound={onRouteFound}
        />

        {pickupLocation && (
          <Marker
            position={[
              pickupLocation.lat,
              pickupLocation.lng,
            ]}
            icon={markerIcon}
          >
            <Popup>
              <strong>Pickup Location</strong>
              <br />
              Selected pickup point
            </Popup>
          </Marker>
        )}

        {destinationLocation && (
          <Marker
            position={[
              destinationLocation.lat,
              destinationLocation.lng,
            ]}
            icon={markerIcon}
          >
            <Popup>
              <strong>Destination</strong>
              <br />
              Selected destination
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}