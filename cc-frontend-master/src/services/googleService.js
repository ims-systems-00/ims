import { fromAddress, setKey } from "react-geocode";
export async function getGeoLocationFromAddress(address = "") {
  setKey(process.env.REACT_APP_GOOGLE_API_KEY);
  try {
    let results = await fromAddress(address);
    return results[0]?.geometry.location;
  } catch (err) {
    console.log(err);
  }
}
