import useAttachments from "../../../sharedHooks/useAttachments";
export default function useStore({ module = null, moduleType = null }) {
  return useAttachments({ module, moduleType });
}
