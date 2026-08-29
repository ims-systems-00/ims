import React from "react";
import { useLocationParameter } from "../store";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { BiCurrentLocation } from "react-icons/bi";
import { Marker, GoogleMap } from "@react-google-maps/api";
import useGoogle from "../../../../store/applicationStore/hooks/useGoogle";
const mapHeight = 300;
export default function Drawer({}) {
  const { viewingLocation } = useLocationParameter();
  const { isGoogleJsAPILoaded } = useGoogle();
  if (!viewingLocation) return null;
  console.log(viewingLocation);

  return (
    <div className="py-3">
      <h6>Geographical information</h6>
      <div className="bg-secondary-extra-light rounded-2 my-2 p-3">
        <small className="text-secondary">
          Reference: {viewingLocation.reference}
        </small>
        <p className="text-dark my-1">
          <HiOutlineLocationMarker />{" "}
          {viewingLocation?.addressInMap ||
            `${viewingLocation?.addressBuilding}, ${viewingLocation?.addressStreet}, ${viewingLocation?.addressCity}, ${viewingLocation?.addressPostCode}, ${viewingLocation?.addressStateProvince}, ${viewingLocation?.addressCountry}`}
        </p>
        <p>
          <BiCurrentLocation /> Longitude: {viewingLocation?.lng || "N/A"}{" "}
          Latirude: {viewingLocation?.lat || "N/A"}
        </p>
      </div>
      <h6>Map</h6>
      {viewingLocation?.addressInMap ? (
        <div
          style={{ height: mapHeight }}
          className="my-2 rounded-3 overflow-hidden"
        >
          {isGoogleJsAPILoaded && (
            <GoogleMap
              center={{ lng: viewingLocation.lng, lat: viewingLocation.lat }}
              zoom={8}
              mapContainerClassName="h-100 w-100"
              options={{
                disableDefaultUI: true,
                zoomControl: false,
              }}
            >
              <Marker
                position={{
                  lng: viewingLocation.lng,
                  lat: viewingLocation.lat,
                }}
              />
            </GoogleMap>
          )}
        </div>
      ) : (
        <div
          style={{ height: mapHeight }}
          className="my-2 rounded-3 overflow-hidden bg-secondary-extra-light d-flex flex-column justify-content-center align-items-center"
        >
          <HiOutlineLocationMarker size={20} className="text-secondary mb-3" />
          <p className="text-secondary mb-2">Location not found in map</p>
          <div className="text-center">
            <p className="mb-1">
              {viewingLocation?.addressBuilding &&
                `${viewingLocation.addressBuilding}, `}
              {viewingLocation?.addressStreet &&
                `${viewingLocation.addressStreet}, `}
              {viewingLocation?.addressCity &&
                `${viewingLocation.addressCity}, `}
              {viewingLocation?.addressPostCode &&
                `${viewingLocation.addressPostCode}, `}
              {viewingLocation?.addressStateProvince &&
                `${viewingLocation.addressStateProvince}, `}
              {viewingLocation?.addressCountry &&
                viewingLocation.addressCountry}
            </p>
          </div>
        </div>
      )}
      <h6>Other details</h6>
      <div className="bg-secondary-extra-light rounded-2 my-2 p-3">
        <p className="text-dark">Activities</p>
        <p className="my-1">{viewingLocation.descriptionOfActivities}</p>
        <p className="text-dark">GHG assessment inclusion</p>
        <p className="my-1">{viewingLocation.ghgAssessmentInclusion}</p>
        <p className="text-dark">Comments</p>
        <p className="my-1">{viewingLocation.comment}</p>
      </div>
    </div>
  );
}
