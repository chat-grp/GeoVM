'use client';
import {useEffect, useRef, useMemo, useState} from 'react';
import maplibregl, {Map as MaplibreMap, StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Feature } from 'geojson';
import {trixelsToFC, getTriResolutionForZoom, getTrixelsForView } from 'htm-trixel';
import {globeStyle} from '../map/map-style';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const HTM_SOURCE_ID = 'htm-trixels-source';
const HTM_INTERACTIVE_FILL_LAYER_ID = 'htm-interactive-fill-layer'; // For clicks
const HTM_STROKE_LAYER_ID = 'htm-stroke-layer';             // For visible borders
const HTM_HIGHLIGHT_FILL_LAYER_ID = 'htm-highlight-fill-layer'; // For selected trixel fill

interface ClickedTrixelInfo {
  displayId: string;
  mapFeatureId: string | number; // The ID used by MapLibre feature state (after promoteId)
}

export default function DemoGlobe() {
  console.log("[DemoGlobe Minimal] Component rendering START");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const lastHtmResolutionRef = useRef<number | null>(null);

  const [showTrixels, setShowTrixels] = useState(true);
  const [clickedTrixelInfo, setClickedTrixelInfo] = useState<ClickedTrixelInfo | null>(null);

  const applyHtmUpdate = (currentMap: MaplibreMap, newRes: number) => {
    console.log(`[DemoGlobe Minimal] Applying HTM update. NewRes: ${newRes}, PrevRes: ${lastHtmResolutionRef.current}`);
    updateHtmVisualization(currentMap, newRes);
    lastHtmResolutionRef.current = newRes;
  };

  // Dedicated function to fetch trixels and update map visualization
  const updateHtmVisualization = (currentMap: MaplibreMap, newResolution: number) => {
    console.log(`[DemoGlobe Minimal] Updating HTM Visualization to Res: ${newResolution}`);

    const trixelIds = getTrixelsForView(null, newResolution);

    if (trixelIds.length === 0) {
      console.warn(`[DemoGlobe Minimal] No trixel IDs returned for HTM Res ${newResolution}.`);
      const source = currentMap.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;
      if (source) {
          source.setData({ type: 'FeatureCollection', features: [] });
      }
      // Clear selection if trixels are cleared
      if (clickedTrixelInfo) {
        setClickedTrixelInfo(null);
      }
      return;
    }

    // Assuming trixelsToFC creates features where feature.properties.trixelId is the string ID.
    const featureCollection = trixelsToFC(trixelIds);
    
    // Log the first feature to inspect its structure, especially the ID property
    if (featureCollection.features.length > 0) {
      console.log("[DemoGlobe Minimal] Sample feature from trixelsToFC:", JSON.parse(JSON.stringify(featureCollection.features[0])));
    }

    // Ensure each feature has a 'trixelId' property for promoteId and for our use.
    // This is an ASSUMPTION about trixelsToFC's output structure.
    // If trixelsToFC already sets a top-level `id` on features that is the string trixel ID,
    // then promoteId: 'trixelId' (if trixelId is in properties) or promoteId: 'id' (if top-level) would be used.
    // For this example, let's assume feature.properties.id contains the string trixel ID.
    // And we will use feature.properties.id for promoteId and display.
    // A common pattern is for the source data to have a unique ID, let's ensure our GeoJSON has it clearly.
    // If trixelsToFC puts the ID in `feature.properties.id`:
    featureCollection.features.forEach((f: Feature) => {
      if (f.properties && f.properties.id) { // Assuming string ID is in properties.id
        // f.id = f.properties.id; // If maplibre needs top-level numeric ID, this would be an issue. promoteId is better.
      } else {
        console.warn("[DemoGlobe Minimal] Feature created by trixelsToFC is missing properties.id for trixelId promotion.", f);
      }
    });

    const source = currentMap.getSource(HTM_SOURCE_ID) as maplibregl.GeoJSONSource;

    if (source) {
      source.setData(featureCollection);
    } else {
      currentMap.addSource(HTM_SOURCE_ID, {
          type: 'geojson',
          data: featureCollection,
          promoteId: 'id' // ASSUMPTION: feature.properties.id contains the string ID like "N001"
      });
      // Add the layers in order: interactive fill (bottom), then highlight fill, then stroke (top)
      currentMap.addLayer({
        id: HTM_INTERACTIVE_FILL_LAYER_ID,
        type: 'fill',
        source: HTM_SOURCE_ID,
        paint: {
          'fill-color': '#000000', // Can be any color, opacity is key
          'fill-opacity': 0.01     // Almost transparent, but clickable
        },
        layout: {
          'visibility': showTrixels ? 'visible' : 'none'
        }
      });

      currentMap.addLayer({
        id: HTM_HIGHLIGHT_FILL_LAYER_ID,
        type: 'fill',
        source: HTM_SOURCE_ID,
        paint: {
          'fill-color': '#FF8C00', // DarkOrange
          'fill-opacity': 0.5
        },
        filter: ['==', ['id'], ''] // Initially show nothing
      });
      // Then add the line layer on top
      currentMap.addLayer({
        id: HTM_STROKE_LAYER_ID,
        type: 'line',
        source: HTM_SOURCE_ID,
        layout: {
          'visibility': showTrixels ? 'visible' : 'none'
        },
        paint: {
            'line-color': '#088',
            'line-width': 1
        },
      });
    }
    console.log(`[DemoGlobe Minimal] Displayed ${featureCollection.features.length} trixels for HTM Res ${newResolution}.`);
  };

  useEffect(() => {
    console.log("[DemoGlobe Minimal] Main useEffect running START (map setup)");
    if (mapRef.current || !mapContainerRef.current) {
      console.log("[DemoGlobe Minimal] Main useEffect exiting early (map exists or container missing)");
      return;
    }

    const map = new MaplibreMap({
      container: mapContainerRef.current,
      style: globeStyle as StyleSpecification,
      center: [0, 0],
      zoom: 0.9,
      minZoom: 0,
      maxZoom: 6, // Max zoom for the map itself
    });
    mapRef.current = map;
    console.log("[DemoGlobe Minimal] Map object created");

    map.on('load', () => {
      console.log("[DemoGlobe Minimal] map.on('load') event fired");
      if (mapRef.current) {
        const initialRawZoom = mapRef.current.getZoom();
        const initialLat = mapRef.current.getCenter().lat;
        const initialLatRad = initialLat * Math.PI / 180;
        // Clamp initialLatRad to avoid Math.cos(PI/2) = 0 issues if map somehow loads at pole
        const clampedInitialLatRad = Math.min(Math.max(initialLatRad, -89.99 * Math.PI / 180), 89.99 * Math.PI / 180);
        const normalizedInitialZoom = initialRawZoom + Math.log2(1 / Math.cos(clampedInitialLatRad));

        const initialHtmResolution = getTriResolutionForZoom(normalizedInitialZoom);
        console.log(`[DemoGlobe Minimal] Initial load. RawZoom: ${initialRawZoom.toFixed(2)}, Lat: ${initialLat.toFixed(2)}, NormZoom: ${normalizedInitialZoom.toFixed(2)}, Target HTM Res: ${initialHtmResolution}.`);
        applyHtmUpdate(mapRef.current, initialHtmResolution);
      }

      // Click listener for the HTM layer
      map.on('click', HTM_INTERACTIVE_FILL_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        if (!showTrixels) return; // Don't process clicks if layer is hidden

        if (e.features && e.features.length > 0) {
          const clickedFeature = e.features[0];
          // Log the clicked feature to inspect its ID and properties
          console.log("[DemoGlobe Minimal] Clicked map feature:", JSON.parse(JSON.stringify(clickedFeature)));

          // The feature ID used by setFeatureState will be feature.id (due to promoteId)
          // The display ID is feature.properties.id (our assumption)
          const displayId = clickedFeature.properties?.id as string; 
          const mapFeatureVal = clickedFeature.id; // This is the ID maplibre uses after promoteId

          if (!displayId || mapFeatureVal === undefined) {
            console.error("[DemoGlobe Minimal] Clicked feature is missing ID property or mapFeatureVal is undefined.", clickedFeature);
            return;
          }

          // Set new selection state by updating the filter of the fill layer
          if (mapRef.current?.getLayer(HTM_HIGHLIGHT_FILL_LAYER_ID)){
            mapRef.current.setFilter(HTM_HIGHLIGHT_FILL_LAYER_ID, ['==', ['id'], mapFeatureVal]);
          }
          setClickedTrixelInfo({ displayId: displayId, mapFeatureId: mapFeatureVal });
          e.preventDefault(); // Prevent map click from propagating if we handled a feature click
        } 
      });

      // General map click to clear selection (if no specific feature on HTM_LAYER_ID was clicked)
      map.on('click', (e: maplibregl.MapMouseEvent) => {
        // Check if the click was on our HTM layer. If so, the specific layer handler above already ran.
        // This logic might need refinement if e.g. features from other layers could be clicked.
        // A simple way: if no feature was set by the layer-specific click, clear.
        // However, the `e.defaultPrevented` check is more robust here.
        if (!e.defaultPrevented && clickedTrixelInfo && mapRef.current?.getLayer(HTM_HIGHLIGHT_FILL_LAYER_ID)) {
            console.log("[DemoGlobe Minimal] General map click, clearing selection.");
            mapRef.current.setFilter(HTM_HIGHLIGHT_FILL_LAYER_ID, ['==', ['id'], '']);
            setClickedTrixelInfo(null);
        }
      });

      map.on('zoomend', (e: maplibregl.MapLibreZoomEvent) => {
        if (!mapRef.current) return;

        let userInitiatedZoomIntent = false;
        const eventSourceInfo = [];

        if (!e.originalEvent) {
          userInitiatedZoomIntent = true; // Programmatic zoom (flyTo, zoomTo, etc.)
          eventSourceInfo.push('Programmatic/Internal');
        } else if (e.originalEvent instanceof WheelEvent) {
          userInitiatedZoomIntent = true; // Mouse wheel
          eventSourceInfo.push('WheelEvent');
        } else if (typeof TouchEvent !== 'undefined' && e.originalEvent instanceof TouchEvent) {
          userInitiatedZoomIntent = true; // Pinch zoom
          eventSourceInfo.push('TouchEvent');
        } else if (e.originalEvent instanceof MouseEvent) {
          const target = e.originalEvent.target as HTMLElement;
          const mapContainer = mapRef.current.getContainer();
          const zoomInButton = mapContainer.querySelector('.maplibregl-ctrl-zoom-in');
          const zoomOutButton = mapContainer.querySelector('.maplibregl-ctrl-zoom-out');
          if ((zoomInButton && zoomInButton.contains(target)) || (zoomOutButton && zoomOutButton.contains(target))) {
            userInitiatedZoomIntent = true; // Click on default zoom buttons
            eventSourceInfo.push('ZoomButtonMouseEvent');
          } else {
            eventSourceInfo.push('OtherMouseEvent(e.g.drag)');
            // MouseEvent not on a zoom button (e.g., from map drag). NOT considered user-initiated for HTM update.
          }
        } else {
          // Check if originalEvent exists and has a type property before accessing it
          if (e.originalEvent && typeof (e.originalEvent as any).type === 'string') {
            eventSourceInfo.push(`UnknownOriginalEvent:${(e.originalEvent as any).type}`);
          } else {
            eventSourceInfo.push('UnknownOriginalEvent:type N/A');
          }
          // Other originalEvent types? Default to not user-initiated for safety.
        }

        const currentRawZoom = mapRef.current.getZoom();
        const currentLat = mapRef.current.getCenter().lat;
        const currentLatRad = currentLat * Math.PI / 180;
        // Clamp currentLatRad to avoid Math.cos(PI/2) = 0 issues
        const clampedCurrentLatRad = Math.min(Math.max(currentLatRad, -89.99 * Math.PI / 180), 89.99 * Math.PI / 180);
        const normalizedCurrentZoom = currentRawZoom + Math.log2(1 / Math.cos(clampedCurrentLatRad));

        const potentialNewHtmResolution = getTriResolutionForZoom(normalizedCurrentZoom);

        console.log(`[DemoGlobe Minimal] map.on('zoomend') fired. Source(s): [${eventSourceInfo.join(', ')}]. UserIntent: ${userInitiatedZoomIntent}. RawZoom: ${currentRawZoom.toFixed(2)}, Lat: ${currentLat.toFixed(2)}, NormZoom: ${normalizedCurrentZoom.toFixed(2)}, PotentialNewHTMRes: ${potentialNewHtmResolution}, LastAppliedHTMRes: ${lastHtmResolutionRef.current}`);

        if (userInitiatedZoomIntent) {
          if (e.originalEvent instanceof WheelEvent) {
            const isZoomIn = e.originalEvent.deltaY < 0;
            if (isZoomIn) {
              // Zooming In with Wheel
              if (lastHtmResolutionRef.current !== null && potentialNewHtmResolution > lastHtmResolutionRef.current) {
                console.log(`[DemoGlobe Minimal] Wheel zoom IN: New HTM Res (${potentialNewHtmResolution}) is higher than current (${lastHtmResolutionRef.current}). Updating.`);
                applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
              } else if (lastHtmResolutionRef.current === null && potentialNewHtmResolution !== lastHtmResolutionRef.current) {
                // Initial case or if lastHtmResolutionRef was somehow reset to null and resolution changed
                console.log(`[DemoGlobe Minimal] Wheel zoom IN (initial/null): New HTM Res (${potentialNewHtmResolution}). Updating.`);
                applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
              } else {
                console.log(`[DemoGlobe Minimal] Wheel zoom IN: Potential HTM Res (${potentialNewHtmResolution}) is not higher than current (${lastHtmResolutionRef.current}). Maintaining current resolution.`);
              }
            } else {
              // Zooming Out with Wheel
              if (potentialNewHtmResolution !== lastHtmResolutionRef.current) {
                console.log(`[DemoGlobe Minimal] Wheel zoom OUT: HTM Res changed to ${potentialNewHtmResolution}. Updating.`);
                applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
              } else {
                console.log(`[DemoGlobe Minimal] Wheel zoom OUT: HTM Res (${potentialNewHtmResolution}) is unchanged. No visual update needed.`);
              }
            }
          } else {
            // Other user-initiated zoom (buttons, programmatic)
            if (potentialNewHtmResolution !== lastHtmResolutionRef.current) {
              console.log(`[DemoGlobe Minimal] Non-wheel user zoom: HTM Res changed to ${potentialNewHtmResolution}. Updating.`);
              applyHtmUpdate(mapRef.current, potentialNewHtmResolution);
            } else {
              console.log(`[DemoGlobe Minimal] Non-wheel user zoom: HTM Res (${potentialNewHtmResolution}) is unchanged. No visual update needed.`);
            }
          }
        } else {
          console.log(`[DemoGlobe Minimal] Non-user-initiated zoom event or pan-induced zoom adjustment. HTM resolution (${lastHtmResolutionRef.current}) maintained.`);
        }
      });
    });

    return () => {
      console.log("[DemoGlobe Minimal] Main useEffect cleanup running");
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  useEffect(() => {
    // Effect to toggle layer visibility based on showTrixels state
    const map = mapRef.current;
    if (map) {
      if (map.getLayer(HTM_STROKE_LAYER_ID)) {
        map.setLayoutProperty(HTM_STROKE_LAYER_ID, 'visibility', showTrixels ? 'visible' : 'none');
      }
      if (map.getLayer(HTM_HIGHLIGHT_FILL_LAYER_ID)) {
        map.setLayoutProperty(HTM_HIGHLIGHT_FILL_LAYER_ID, 'visibility', showTrixels ? 'visible' : 'none');
      }
      if (map.getLayer(HTM_INTERACTIVE_FILL_LAYER_ID)) {
        map.setLayoutProperty(HTM_INTERACTIVE_FILL_LAYER_ID, 'visibility', showTrixels ? 'visible' : 'none');
      }

      if (!showTrixels && clickedTrixelInfo) {
        // Clear selection if layer is hidden
        if (map.getLayer(HTM_HIGHLIGHT_FILL_LAYER_ID)){
            map.setFilter(HTM_HIGHLIGHT_FILL_LAYER_ID, ['==', ['id'], '']);
        }
        setClickedTrixelInfo(null);
      }
    }
  }, [showTrixels, clickedTrixelInfo]); // Listen to clickedTrixelInfo to ensure clearing happens correctly

  console.log("[DemoGlobe Minimal] Component rendering END");
  return (
    <div className="w-full h-full relative">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 bg-white/80 p-2 rounded shadow-md flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="show-trixels-toggle"
                    checked={showTrixels}
                    onCheckedChange={setShowTrixels}
                />
                <Label htmlFor="show-trixels-toggle">Show Trixels</Label>
            </div>
            {clickedTrixelInfo && (
                <p className="text-sm">Clicked Trixel: <span className="font-bold">{clickedTrixelInfo.displayId}</span></p>
            )}
        </div>
    </div>
  );
}