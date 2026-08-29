import { useJsApiLoader } from "@react-google-maps/api";
const googleLibraries = ["places"];
export default function useGoogle() {
  let { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_API_KEY,
    libraries: googleLibraries,
  });
  return {
    isGoogleJsAPILoaded: isLoaded,
  };
}
