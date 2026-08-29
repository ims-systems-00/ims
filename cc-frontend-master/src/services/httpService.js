import axios from "axios";
const HTTP_DEFAULT = axios.create({
  withCredentials: true,
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

function setUserAccessWithJWT(accessToken) {
  HTTP_DEFAULT.defaults.headers.common["x-auth-accesstoken"] = accessToken;
}

function setOrganisationAccess(orgid) {
  HTTP_DEFAULT.defaults.headers.common["x-org-id"] = orgid;
}

function clearOrganisationAccess() {
  delete HTTP_DEFAULT.defaults.headers.common["x-org-id"];
}
function setBusinessUnitAccess(id) {
  HTTP_DEFAULT.defaults.headers.common["x-group-id"] = id;
}
let http = {
  instance: HTTP_DEFAULT,
  get: HTTP_DEFAULT.get,
  post: HTTP_DEFAULT.post,
  put: HTTP_DEFAULT.put,
  patch: HTTP_DEFAULT.patch,
  delete: HTTP_DEFAULT.delete,
  setUserAccessWithJWT,
  setOrganisationAccess,
  clearOrganisationAccess,
  setBusinessUnitAccess,
};
export default http;
