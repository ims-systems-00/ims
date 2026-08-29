import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/auth`;

export async function token(authCode) {
  return http.post(apiEndPoint + "/token", {
    authCode,
  });
}
export async function authorize(config) {
  return http.get(
    apiEndPoint + "/authorize" + `?redirect_uri=${config.redirect_uri}`
  );
}
export async function refreshToken() {
  return http.post(apiEndPoint + "/refresh-token");
}

export async function login(data) {
  return http.post(apiEndPoint, data);
}

export async function logout() {
  localStorage.clear();
  sessionStorage.clear();
  await http.delete(apiEndPoint);
}
