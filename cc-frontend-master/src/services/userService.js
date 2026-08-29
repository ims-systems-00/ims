import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/users`;
const profileKey = "imsprofile";
export function getUserWithBasicInfo(userId) {
  return http.get(`${apiEndPoint}/${userId}/basic-info/`);
}
export function refreshProfileCache(data) {
  localStorage.setItem(profileKey, JSON.stringify(data));
}
export function getUserProfileFromCache() {
  return JSON.parse(localStorage.getItem(profileKey));
}

export function changeUserSignature(userId, signatureInfo) {
  return http.put(`${apiEndPoint}/${userId}/signature/`, { signatureInfo });
}
