import { useAutoAnimate } from "@formkit/auto-animate/react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import { BiCurrentLocation } from "react-icons/bi";
import { HiOutlineLocationMarker } from "react-icons/hi";
import useGoogle from "../store/applicationStore/hooks/useGoogle";

const defaultMap = {
  center: { lat: 52.3555, lng: 1.1743 },
  zoom: 8,
  options: {
    disableDefaultUI: true,
    zoomControl: false,
  },
};
export default function LocationCard({
  ccLocation = null,
  center = { lat: 0, lng: 0 },
}) {
  const [hovering, setHovering] = useState(false);
  const [editParentRef] = useAutoAnimate();
  const { isGoogleJsAPILoaded } = useGoogle();
  const [mapState, setMapState] = useState(defaultMap);
  useEffect(() => {
    if (center)
      return setMapState((pm) => ({
        ...pm,
        center: {
          lat: center.lat,
          lng: center.lng,
        },
      }));
    // if ("geolocation" in navigator)
    //   navigator.geolocation.getCurrentPosition((pos) => {
    //     setMapState((pm) => ({
    //       ...pm,
    //       center: {
    //         lat: center.lat || pos.coords.latitude,
    //         lng: center.lng || pos.coords.longitude,
    //       },
    //     }));
    //   });
  }, [center]);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="bg-secondary-extra-light rounded-2 mb-2 p-3 d-flex align-items-center"
    >
      <div className="flex-grow-1 me-2">
        <small className="text-secondary">
          Reference: {ccLocation.reference}
        </small>
        <p className="text-dark mb-3">
          <HiOutlineLocationMarker />
          {ccLocation?.addressInMap ||
            `${ccLocation?.addressBuilding}, ${ccLocation?.addressStreet}, ${ccLocation?.addressCity}, ${ccLocation?.addressPostCode}, ${ccLocation?.addressStateProvince}, ${ccLocation?.addressCountry}`}
        </p>
        <p>
          <BiCurrentLocation /> Longitude: {center.lng || "N/A"} Latirude:
          {center.lat || "N/A"}
        </p>
      </div>
      {/* {hovering && (
        <Button outline size="sm" className="ms-1 border-0">
          <FiEdit3 className="cursor-pointer" />
        </Button>
      )} */}
      <div className="location-card-map">
        {ccLocation?.addressInMap ? (
          isGoogleJsAPILoaded ? (
            <GoogleMap
              center={mapState.center}
              zoom={mapState.zoom}
              mapContainerClassName="h-100 w-100"
              options={mapState.options}
            >
              <Marker position={mapState.center} />
            </GoogleMap>
          ) : (
            <p className="h-100 w-100">Loading map...</p>
          )
        ) : (
          <div className="h-100 w-100 bg-secondary-light rounded-2 d-flex flex-column justify-content-center align-items-center ">
            <HiOutlineLocationMarker
              size={20}
              className="text-secondary mb-3"
            />
            <p className="text-secondary mx-2">Location not found in map</p>
          </div>
        )}
      </div>
    </div>
  );
}
