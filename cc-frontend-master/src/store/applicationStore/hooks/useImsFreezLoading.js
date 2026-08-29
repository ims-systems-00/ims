import { useState } from "react";
/**
 * this hook not recomended to use outside of this store in anny component directly.
 * the store exposes utility function based on this hook to maintain ui logics.
 */
export default function useImsFreezLoading() {
  const [isImsFreezedForLoading, setImsFreezedForLoadng] = useState(false);
  const [loadingNarratives, setLoadingNarratives] = useState("Loading...");
  const freezImsForLoading = (_loadingNarratives) => {
    setImsFreezedForLoadng(true);
    setLoadingNarratives(_loadingNarratives);
  };
  const unFreezImsForLoading = () => {
    setImsFreezedForLoadng(false);
    setLoadingNarratives("Loading...");
  };
  const toggleFreezImsForLoading = () => {
    setImsFreezedForLoadng(!isImsFreezedForLoading);
    setLoadingNarratives("Loading...");
  };

  return {
    isImsFreezedForLoading,
    loadingNarratives,
    freezImsForLoading,
    unFreezImsForLoading,
    toggleFreezImsForLoading,
  };
}