import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { TILE_URL, MAP_ATTRIBUTION } from '../../services/map.js';
import { formatPrice } from '../../models/parking.model.js';

function markerHtml(parking, selected) {
  const price = parking.pricePerHour != null ? formatPrice(parking.pricePerHour) : 'P';
  return `<div class="map-pin${selected ? ' is-selected' : ''}${parking.live ? ' is-live' : ''}">
    <span class="map-pin__label">${price}</span>
  </div>`;
}

function popupHtml(parking) {
  const price =
    parking.pricePerHour != null
      ? `<div class="map-popup__price"><strong>${formatPrice(parking.pricePerHour)}</strong> /hora</div>`
      : '<div class="map-popup__price"><small>Precio al reservar</small></div>';
  return `
    <div class="map-popup">
      <h4>${parking.name}</h4>
      <p>${parking.address || ''}</p>
      ${price}
      <button type="button" class="btn btn--primary btn--sm" data-reserve="${parking.id || ''}">Ver y reservar</button>
    </div>
  `;
}

export default function MapView({
  center,
  zoom = 14,
  parkings = [],
  selectedId = null,
  userLocation = null,
  flyTarget = null,
  onBoundsChange,
  onMarkerClick,
  onReserve,
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const userLayerRef = useRef(null);
  const handlersRef = useRef({ onBoundsChange, onMarkerClick, onReserve });

  handlersRef.current = { onBoundsChange, onMarkerClick, onReserve };

  useEffect(() => {
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([center.lat, center.lon], zoom);

    L.tileLayer(TILE_URL, {
      attribution: MAP_ATTRIBUTION,
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    layerRef.current = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
    }).addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    map.on('moveend', () => {
      const bounds = map.getBounds();
      handlersRef.current.onBoundsChange?.({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
        zoom: map.getZoom(),
      });
    });

    mapRef.current = map;
    const resize = () => map.invalidateSize();
    window.addEventListener('resize', resize);
    const timer = setTimeout(resize, 250);

    return () => {
      window.removeEventListener('resize', resize);
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    parkings.forEach((parking) => {
      if (parking.lat == null || parking.lon == null) return;
      const isSelected = selectedId && (parking.id === selectedId || parking.externalId === selectedId);
      const marker = L.marker([parking.lat, parking.lon], {
        icon: L.divIcon({
          className: 'map-pin-wrap',
          html: markerHtml(parking, isSelected),
          iconSize: [64, 30],
          iconAnchor: [32, 30],
          popupAnchor: [0, -28],
        }),
        riseOnHover: true,
      });

      marker.bindPopup(popupHtml(parking), { closeButton: true, minWidth: 200 });
      marker.on('popupopen', (event) => {
        const button = event.popup.getElement()?.querySelector('[data-reserve]');
        button?.addEventListener('click', () => {
          map.closePopup();
          handlersRef.current.onReserve?.(parking);
        });
      });
      marker.on('click', () => handlersRef.current.onMarkerClick?.(parking));
      marker.addTo(layer);
    });
  }, [parkings, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget || flyTarget.lat == null) return;
    map.flyTo([flyTarget.lat, flyTarget.lon], flyTarget.zoom || 14, { duration: 0.8 });
  }, [flyTarget]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!userLocation) return;

    L.marker([userLocation.lat, userLocation.lon], {
      icon: L.divIcon({
        className: 'map-pin-wrap',
        html: '<div class="map-user-dot" aria-label="Tu ubicación"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(layer);
    map.flyTo([userLocation.lat, userLocation.lon], 15, { duration: 0.8 });
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !selectedId) return;
    const parking = parkings.find((p) => p.id === selectedId || p.externalId === selectedId);
    if (!parking) return;
    map.flyTo([parking.lat, parking.lon], Math.max(map.getZoom(), 16), { duration: 0.6 });
    layer.eachLayer((item) => {
      const latLng = item.getLatLng?.();
      if (latLng && latLng.lat === parking.lat && latLng.lng === parking.lon) {
        item.openPopup();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={containerRef} className={`map-view ${className}`} role="application" aria-label="Mapa de parkings" />;
}
