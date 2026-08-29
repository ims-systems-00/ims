import http from "./httpService";
const apiEndPoint = `/api/${process.env.REACT_APP_API_VERSION}/activities`;

export function createActivity(data) {
  return http.post(`${apiEndPoint}/`, {
    moduleId: data.module,
    moduleType: data.moduleType,
    metaInfo: data.metaInfo,
    value: data.value,
  });
}
export function lisActivities({ query }) {
  return http.get(`${apiEndPoint}/?${query}`);
}
export function getActivity(id) {
  return http.get(`${apiEndPoint}/${id}/`);
}
export function updateActivity(id, data) {
  return http.put(`${apiEndPoint}/${id}`, {
    value: data.value,
  });
}
export function deleteActivity(id) {
  return http.delete(`${apiEndPoint}/${id}/`);
}

export function mapToActivityModel(data) {
  return {
    data: {
      value: data.value,
    },
    errors: {},
  };
}
