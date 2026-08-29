import toast from "react-hot-toast";

const useAPISuccess = () => {
  function handleSuccess(apiResponse) {
    if (typeof apiResponse === "string") return toast.success(apiResponse);
    /** we are assuming data will be present because it is a success */
    let data = apiResponse?.data || null;
    if (!data) return toast("Success returned early.");
    let message = data.message || "Success.";
    toast.success(message);
  }
  return {
    handleSuccess,
  };
};
export default useAPISuccess;
