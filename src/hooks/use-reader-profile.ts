"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_SIGNAL_PROFILE,
  applyProfileInteraction,
  clearLegacyLocalProfile,
  hasLearnedSignals,
  mergeLegacyProfileIntoState,
  readLegacyLocalProfile,
  readLocalProfile,
  writeLocalProfile,
  type ProfileInteraction,
  type SignalProfileState,
} from "@/lib/reader-profile";
import { Source } from "@/lib/types";

export function useReaderProfile({
  enabled = true,
  sources,
}: {
  enabled?: boolean;
  sources: Source[];
}) {
  const [loading, setLoading] = useState(enabled);
  const [profile, setProfile] = useState<SignalProfileState>(EMPTY_SIGNAL_PROFILE);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!enabled) {
      setProfile(EMPTY_SIGNAL_PROFILE);
      setLoading(false);
      return;
    }

    const storedProfile = readLocalProfile();

    if (storedProfile) {
      setProfile(storedProfile);
      setLoading(false);
      return;
    }

    const legacy = readLegacyLocalProfile();
    const mergedProfile = mergeLegacyProfileIntoState(
      EMPTY_SIGNAL_PROFILE,
      legacy,
      sources
    );
    setProfile(mergedProfile);
    writeLocalProfile(mergedProfile);
    clearLegacyLocalProfile();
    setLoading(false);
  }, [enabled, sources]);

  const trackInteraction = useCallback((interaction: ProfileInteraction) => {
    setProfile((current) => {
      const nextProfile = applyProfileInteraction(current, interaction);
      writeLocalProfile(nextProfile);
      return nextProfile;
    });
  }, []);

  const replaceProfile = useCallback((nextProfile: SignalProfileState) => {
    setProfile(nextProfile);
    writeLocalProfile(nextProfile);
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(EMPTY_SIGNAL_PROFILE);
    writeLocalProfile(EMPTY_SIGNAL_PROFILE);
  }, []);

  return useMemo(
    () => ({
      loading,
      profile,
      hasLearnedProfile: hasLearnedSignals(profile),
      trackInteraction,
      replaceProfile,
      resetProfile,
    }),
    [loading, profile, replaceProfile, resetProfile, trackInteraction]
  );
}
