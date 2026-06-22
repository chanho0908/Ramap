'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  exchangeAuthCodeForSession,
  getCurrentSession,
  getCurrentUser,
} from '@ramap/shared';

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/map';
  }

  return next;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const code = searchParams.get('code');
  const authError =
    searchParams.get('error_description') || searchParams.get('error');
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get('next')),
    [searchParams]
  );

  useEffect(() => {
    let isMounted = true;

    async function completeSignIn() {
      if (authError) {
        setErrorMessage(authError);
        return;
      }

      if (!code) {
        try {
          const currentSession = await getCurrentSession();
          const currentUser = currentSession?.user ?? (await getCurrentUser());

          if (currentUser) {
            router.replace(nextPath);
            return;
          }
        } catch {
          // Fall through to the callback error.
        }

        setErrorMessage('인증 코드를 확인하지 못했습니다.');
        return;
      }

      try {
        await exchangeAuthCodeForSession(code);
        router.replace(nextPath);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? `로그인 세션을 저장하지 못했습니다. ${error.message}`
              : '로그인 세션을 저장하지 못했습니다.'
          );
        }
      }
    }

    completeSignIn();

    return () => {
      isMounted = false;
    };
  }, [authError, code, nextPath, router]);

  if (errorMessage) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">로그인 실패</h1>
        <p className="text-gray-600">{errorMessage}</p>
        <Link
          href="/map"
          className="rounded bg-gray-900 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-700"
        >
          지도로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-3xl font-bold">로그인 처리 중</h1>
      <p className="text-gray-600">잠시만 기다려주세요.</p>
    </main>
  );
}
