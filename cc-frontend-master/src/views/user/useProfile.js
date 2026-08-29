import { useEffect, useState } from "react";
import { getUserWithBasicInfo } from "../../services/userService";

export const useProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserWithBasicInfo(userId);
        setProfile(response.data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  return {
    profile,
    loading,
    error,
  };
};
