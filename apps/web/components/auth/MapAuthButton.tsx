'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getCurrentUser,
  onAuthStateChange,
  signInWithKakao,
  signOut,
} from '@ramap/shared';

interface MapAuthButtonProps {
  redirectPath?: string;
}

function KakaoTalkIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="15"
      viewBox="0 0 16 15"
      className="h-7 w-7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.00005 0C3.5815 0 0 2.76708 0 6.17983C0 8.30228 1.38525 10.1733 3.4947 11.2862L2.60715 14.5285C2.52873 14.815 2.85638 15.0433 3.10798 14.8773L6.99856 12.3096C7.32688 12.3412 7.66054 12.3597 8.00005 12.3597C12.4182 12.3597 16 9.59276 16 6.17983C16 2.76708 12.4182 0 8.00005 0Z"
        fill="black"
      />
    </svg>
  );
}

export function MapAuthButton({ redirectPath = '/map' }: MapAuthButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', redirectPath);

    return callbackUrl.toString();
  }, [redirectPath]);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = onAuthStateChange(({ session }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleClick = async () => {
    setIsSubmitting(true);

    try {
      if (user) {
        await signOut();
        setUser(null);
        return;
      }

      await signInWithKakao({ redirectTo });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isLoading || isSubmitting;
  const label = user ? '로그아웃' : '카카오 로그인';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`absolute bottom-36 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold shadow-xl ring-2 ring-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
        user
          ? 'bg-gray-900 text-white hover:bg-gray-700'
          : 'bg-[#FEE500] text-[#191919] hover:bg-[#F4D800]'
      }`}
      aria-label={label}
      title={label}
    >
      {isDisabled ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-b-transparent" />
      ) : user ? (
        <span aria-hidden="true" className="text-lg leading-none">
          ⎋
        </span>
      ) : (
        <KakaoTalkIcon />
      )}
    </button>
  );
}
